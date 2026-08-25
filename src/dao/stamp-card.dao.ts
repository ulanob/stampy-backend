import { Pool } from "pg";
import { StampCard, CreateStampCardInput, UpdateStampCardInput, StampCardStatus } from "@/src/models/index.model";
import { NotificationWindowDays } from "../models/shared.types";
import { Executor } from "./types";

const stampCardTableName = "stamp_cards"

export type StampCardDAO = {
  createStampCard(fields: CreateStampCardInput, executor: Executor): Promise<StampCard>;
  getAllStampCards(includeDeleted?: boolean): Promise<StampCard[]>;
  getStampCardByID(id: string, includeDeleted?: boolean, executor?: Executor): Promise<StampCard | null>;
  getAllStampCardsByUserID(user_id: string, includeDeleted?: boolean): Promise<StampCard[]>
  updateStampCardByID(id: string, updates: UpdateStampCardInput, executor?: Executor): Promise<StampCard | null>;
  deleteStampCardByID(id: string): Promise<void>
}

export function createStampCardDAO(pool: Pool): StampCardDAO {
  return {
    async createStampCard(fields: CreateStampCardInput, executor: Executor): Promise<StampCard> {

      const sqlString = `
      INSERT INTO ${stampCardTableName}
        (user_id,
        nickname,
        business_id,
        notes,
        stamps_needed,
        status,
        notify_window_days,
        notify_window_start_time,
        notify_window_end_time,
        notification_time_sent,
        notification_cooldown_seconds,
        expiration_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
        ${stampCardColumns}`

      const inputs = [
        fields.user_id,
        fields.nickname,
        fields.business_id,
        fields.notes,
        fields.stamps_needed,
        fields.status ?? 'active',
        fields.notify_window_days,
        fields.notify_window_start_time,
        fields.notify_window_end_time,
        fields.notification_time_sent,
        fields.notification_cooldown_seconds,
        fields.expiration_date
      ]

      const result = await executor.query(sqlString, inputs)

      return mapDbRowToStampCard(result.rows[0]);
    },

    async getAllStampCards(includeDeleted: boolean = false): Promise<StampCard[]> {
      const sqlString = `
        SELECT ${stampCardColumns}, ${stampsAcquiredExpr}
        FROM ${stampCardTableName}
        LEFT JOIN stamp_card_events e ON e.stamp_card_id = ${stampCardTableName}.id
        ${includeDeleted ? '' : `WHERE ${stampCardTableName}.deleted = false`}
        GROUP BY ${stampCardTableName}.id
        ORDER BY ${stampCardTableName}.created_at DESC;`


      const result = await pool.query(sqlString)
      const rows = result.rows

      return rows.map(row => mapDbRowToStampCard(row));
    },

    async getStampCardByID(id: string, includeDeleted: boolean = false, executor: Executor = pool): Promise<StampCard | null> {
      const sqlString = `
        SELECT ${stampCardColumns}, ${stampsAcquiredExpr}
        FROM ${stampCardTableName}
        LEFT JOIN stamp_card_events e ON e.stamp_card_id = ${stampCardTableName}.id
        WHERE ${stampCardTableName}.id = $1
        ${includeDeleted ? '' : `AND ${stampCardTableName}.deleted = false`}
        GROUP BY ${stampCardTableName}.id

      `;

      const result = await executor.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToStampCard(row)
    },

    async getAllStampCardsByUserID(user_id: string, includeDeleted: boolean = false): Promise<StampCard[]> {
      const sqlString = `
        SELECT ${stampCardColumns}, ${stampsAcquiredExpr}
        FROM ${stampCardTableName}
        LEFT JOIN stamp_card_events e ON e.stamp_card_id = ${stampCardTableName}.id
        WHERE ${stampCardTableName}.user_id = $1
        ${includeDeleted ? '' : `AND ${stampCardTableName}.deleted = false`}
        GROUP BY ${stampCardTableName}.id
        ORDER BY ${stampCardTableName}.created_at DESC

      `;

      const result = await pool.query(sqlString, [user_id])
      return result.rows.map(row => mapDbRowToStampCard(row))
    },

    async updateStampCardByID(id: string, updates: UpdateStampCardInput, executor: Executor = pool) {
      const setArgs: string[] = [];
      const values: (string | number | boolean | Date | StampCardStatus | NotificationWindowDays | null)[] = [];

      let i = 1;

      // Safe: keys are derived from typed UpdateStampCardInput, not raw user input
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setArgs.push(`${key} = $${i}`);
          values.push(value);
          i++;
        }
      }

      if (setArgs.length === 0) {
        throw new Error("No fields to update");
      }

      const sqlString = `
        UPDATE ${stampCardTableName}
        SET ${setArgs.join(", ")},
        updated_at = NOW()
        WHERE id = $${i}
        RETURNING id;
      `;
      values.push(id);

      const result = await executor.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return this.getStampCardByID(row.id, true, executor)
    },

    async deleteStampCardByID(id: string): Promise<void> {
      const sqlString = `
      UPDATE ${stampCardTableName}
      SET
        deleted = true,
        deleted_at = NOW()
      WHERE id = $1;`

      await pool.query(sqlString, [id])
    }
  }
}

const stampCardColumns = `
  ${stampCardTableName}.id,
  ${stampCardTableName}.user_id,
  ${stampCardTableName}.nickname,
  ${stampCardTableName}.business_id,
  ${stampCardTableName}.notes,
  ${stampCardTableName}.stamps_needed,
  ${stampCardTableName}.status,
  ${stampCardTableName}.notify_window_days,
  ${stampCardTableName}.notify_window_start_time,
  ${stampCardTableName}.notify_window_end_time,
  ${stampCardTableName}.notification_time_sent,
  ${stampCardTableName}.notification_cooldown_seconds,
  ${stampCardTableName}.expiration_date,
  ${stampCardTableName}.deleted,
  ${stampCardTableName}.deleted_at,
  ${stampCardTableName}.created_at,
  ${stampCardTableName}.updated_at
`

const stampsAcquiredExpr = `
  COALESCE(SUM(
    CASE e.type
      WHEN 'stamp_added' THEN e.quantity
      WHEN 'stamp_removed' THEN -e.quantity
      ELSE 0
    END
  ), 0)::int AS stamps_acquired
`;



function mapDbRowToStampCard(row: StampCard): StampCard {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname ?? null,
    business_id: row.business_id,
    notes: row.notes ?? null,
    stamps_needed: row.stamps_needed ?? 0,
    stamps_acquired: row.stamps_acquired ?? 0,
    status: row.status ?? 'active',
    notify_window_days: row.notify_window_days ?? null,
    notify_window_start_time: row.notify_window_start_time,
    notify_window_end_time: row.notify_window_end_time,
    notification_time_sent: row.notification_time_sent ?? null,
    notification_cooldown_seconds: row.notification_cooldown_seconds ?? null,
    expiration_date: row.expiration_date ? new Date(row.expiration_date) : null,
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
import { Pool } from "pg";
import { GiftCard, CreateGiftCardInput, UpdateGiftCardInput } from "@/src/models/index.model";
import { NotificationWindowDays } from "../models/shared.types";
import { Executor } from "./types";

const giftCardTableName = "gift_cards"

export type GiftCardDAO = {
  createGiftCard(fields: CreateGiftCardInput, executor: Executor): Promise<GiftCard>;
  getAllGiftCards(includeDeleted?: boolean): Promise<GiftCard[]>;
  getGiftCardByID(id: string, includeDeleted?: boolean, executor?: Executor): Promise<GiftCard | null>;
  getAllGiftCardsByUserID(user_id: string, includeDeleted?: boolean): Promise<GiftCard[]>;
  updateGiftCardByID(id: string, updates: UpdateGiftCardInput, executor?: Executor): Promise<GiftCard | null>;
  deleteGiftCardByID(id: string): Promise<void>
}

export function createGiftCardDAO(pool: Pool): GiftCardDAO {
  return {
    async createGiftCard(fields: CreateGiftCardInput, executor: Executor = pool): Promise<GiftCard> {
      // current_balance is not returned here (RETURNING has no access to gift_card_events).
      // Caller (giftCardService.createGiftCard) is responsible for setting it after insert.
      const sqlString = `
      INSERT INTO ${giftCardTableName}
        (user_id,
        business_id,
        nickname,
        notes,
        currency,
        status,
        notify_window_days,
        notify_window_start_time,
        notify_window_end_time,
        notification_time_sent,
        notification_cooldown_seconds,
        expiration_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
      ${giftCardColumns}`

      const inputs = [
        fields.user_id,
        fields.business_id,
        fields.nickname,
        fields.notes,
        fields.currency,
        fields.status,
        fields.notify_window_days,
        fields.notify_window_start_time,
        fields.notify_window_end_time,
        fields.notification_time_sent,
        fields.notification_cooldown_seconds,
        fields.expiration_date,
      ]

      const result = await executor.query(sqlString, inputs)
      return mapDbRowToGiftCard(result.rows[0]);
    },

    async getAllGiftCards(includeDeleted: boolean = false): Promise<GiftCard[]> {
      const sqlString = `
        SELECT ${giftCardColumns}, ${currentBalanceExpr}
        FROM ${giftCardTableName}
        LEFT JOIN gift_card_events e ON e.gift_card_id = ${giftCardTableName}.id
        ${includeDeleted ? '' : `WHERE ${giftCardTableName}.deleted = false`}
        GROUP BY ${giftCardTableName}.id
        ORDER BY ${giftCardTableName}.created_at DESC;
      `;

      const result = await pool.query(sqlString);
      const rows = result.rows;

      return rows.map(row => mapDbRowToGiftCard(row));
    },

    async getGiftCardByID(id: string, includeDeleted: boolean = false, executor: Executor = pool): Promise<GiftCard | null> {
      const sqlString = `
        SELECT ${giftCardColumns}, ${currentBalanceExpr}
        FROM ${giftCardTableName}
        LEFT JOIN gift_card_events e ON e.gift_card_id = ${giftCardTableName}.id
        WHERE ${giftCardTableName}.id = $1
        ${includeDeleted ? '' : `AND ${giftCardTableName}.deleted = false`}
        GROUP BY ${giftCardTableName}.id
      `;

      const result = await executor.query(sqlString, [id]);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToGiftCard(row);
    },

    async getAllGiftCardsByUserID(user_id: string, includeDeleted: boolean = false): Promise<GiftCard[]> {
      const sqlString = `
        SELECT ${giftCardColumns}, ${currentBalanceExpr}
        FROM ${giftCardTableName}
        LEFT JOIN gift_card_events e ON e.gift_card_id = ${giftCardTableName}.id
        WHERE ${giftCardTableName}.user_id = $1
        ${includeDeleted ? '' : `AND ${giftCardTableName}.deleted = false`}
        GROUP BY ${giftCardTableName}.id
        ORDER BY ${giftCardTableName}.created_at DESC
      `;

      const result = await pool.query(sqlString, [user_id]);
      return result.rows.map(row => mapDbRowToGiftCard(row));
    },

    async updateGiftCardByID(id: string, updates: UpdateGiftCardInput, executor: Executor = pool) {
      const setArgs: string[] = [];
      const values: (string | number | boolean | Date | NotificationWindowDays | null)[] = [];

      let i = 1;

      // Safe: keys are derived from typed UpdateGiftCardInput, not raw user input
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
        UPDATE ${giftCardTableName}
        SET ${setArgs.join(", ")},
        updated_at = NOW()
        WHERE id = $${i}
        RETURNING id;
      `;
      values.push(id);

      const result = await executor.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return this.getGiftCardByID(row.id, true, executor);
    },

    async deleteGiftCardByID(id: string): Promise<void> {
      const sqlString = `
      UPDATE ${giftCardTableName}
      SET
        deleted = true,
        deleted_at = NOW()
      WHERE id = $1;`

      await pool.query(sqlString, [id])
    }
  }
}

const giftCardColumns = `
  ${giftCardTableName}.id,
  ${giftCardTableName}.user_id,
  ${giftCardTableName}.nickname,
  ${giftCardTableName}.business_id,
  ${giftCardTableName}.notes,
  ${giftCardTableName}.currency,
  ${giftCardTableName}.status,
  ${giftCardTableName}.notify_window_days,
  ${giftCardTableName}.notify_window_start_time,
  ${giftCardTableName}.notify_window_end_time,
  ${giftCardTableName}.notification_time_sent,
  ${giftCardTableName}.notification_cooldown_seconds,
  ${giftCardTableName}.expiration_date,
  ${giftCardTableName}.deleted,
  ${giftCardTableName}.deleted_at,
  ${giftCardTableName}.created_at,
  ${giftCardTableName}.updated_at
`

// derive current_balance from gift card events
const currentBalanceExpr = `
  COALESCE(SUM(
    CASE e.type
      WHEN 'balance_added' THEN e.amount
      WHEN 'balance_redeemed' THEN -e.amount
      ELSE 0
    END
  ), 0) AS current_balance
`;

function mapDbRowToGiftCard(row: GiftCard): GiftCard {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname ?? null,
    business_id: row.business_id,
    notes: row.notes ?? null,
    current_balance: row.current_balance,
    currency: row.currency,
    status: row.status,
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
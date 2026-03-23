import { Pool } from "pg";
import { GiftCard, CreateGiftCardInput, UpdateGiftCardInput } from "@/src/models/index.model";
import { NotificationWindowDays } from "../models/shared.types";

const giftCardTableName = "gift_cards"

export type GiftCardDAO = {
  createGiftCard(fields: CreateGiftCardInput): Promise<GiftCard | null>;
  getAllCards(includeDeleted?: boolean): Promise<GiftCard[]>;
  getGiftCardByID(id: string, includeDeleted?: boolean): Promise<GiftCard | null>;
  updateGiftCardByID(id: string, updates: UpdateGiftCardInput): Promise<GiftCard | null>;
  deleteGiftCardByID(id: string): Promise<void>
}

export function createGiftCardDAO(pool: Pool): GiftCardDAO {
  return {
    async createGiftCard(fields: CreateGiftCardInput): Promise<GiftCard | null> {

      const sqlString = `
      INSERT INTO ${giftCardTableName}
        (user_id,
        business_id,
        location_id,
        nickname,
        notes,
        initial_balance,
        current_balance,
        currency,
        notify_window_days,
        notify_window_start_time,
        notify_window_end_time,
        notification_time_sent,
        notification_cooldown_time,
        expiration_date,
        deleted,
        deleted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING
        ${giftCardColumns}`

      const inputs = [
        fields.user_id,
        fields.business_id,
        fields.location_id,
        fields.nickname,
        fields.notes,
        fields.initial_balance,
        fields.current_balance,
        fields.currency,
        fields.notify_window_days,
        fields.notify_window_start_time,
        fields.notify_window_end_time,
        fields.notification_time_sent,
        fields.notification_cooldown_time,
        fields.expiration_date,
        false,
        null
      ]

      const result = await pool.query(sqlString, inputs)
      const row = result.rows[0]
      if (!row) return null;


      return mapDbRowToGiftCard(row);
    },

    async getAllCards(includeDeleted: boolean = false): Promise<GiftCard[]> {
      const sqlString = `
        SELECT ${giftCardColumns}
        FROM ${giftCardTableName}
        ${includeDeleted ? '' :
          'WHERE deleted = false'}
        ORDER BY created_at DESC;`

      const result = await pool.query(sqlString)
      const rows = result.rows

      return rows.map(row => mapDbRowToGiftCard(row));
    },
    async getGiftCardByID(id: string, includeDeleted: boolean = false): Promise<GiftCard | null> {
      const sqlString = `
        SELECT ${giftCardColumns}
        FROM ${giftCardTableName}
        WHERE id = $1
        ${includeDeleted ? '' : 'AND deleted = false'}
      `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToGiftCard(row)
    },

    async updateGiftCardByID(id: string, updates: UpdateGiftCardInput) {
      const setArgs: string[] = [];
      const values: any[] = [];

      let i = 1;

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
      RETURNING *;
    `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToGiftCard(row);
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
  id,
  user_id,
  nickname,
  business_id,
  location_id,
  notes,
  initial_balance,
  current_balance,
  currency,
  notify_window_days,
  notify_window_start_time,
  notify_window_end_time,
  notification_time_sent,
  notification_cooldown_time,
  expiration_date,
  deleted,
  deleted_at,
  created_at,
  updated_at
`

type GiftCardRow = {
  id: string;
  user_id: string;
  nickname: string | null;
  business_id: string;
  location_id: string | null;
  notes: string | null;
  initial_balance: number;
  current_balance: number;
  currency: string;
  notify_window_days: NotificationWindowDays | null;
  notify_window_start_time: string | null; // TIME
  notify_window_end_time: string | null;   // TIME
  notification_time_sent: Date | null;
  notification_cooldown_time: number | null;
  expiration_date: Date | null;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapDbRowToGiftCard(row: GiftCardRow): GiftCard {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname ?? null,
    business_id: row.business_id,
    location_id: row.location_id,
    notes: row.notes ?? null,
    initial_balance: row.initial_balance ?? 0,
    current_balance: row.current_balance ?? 0,
    currency: row.currency,
    notify_window_days: row.notify_window_days ?? null,
    notify_window_start_time: row.notify_window_start_time,
    notify_window_end_time: row.notify_window_end_time,
    notification_time_sent: row.notification_time_sent ?? null,
    notification_cooldown_time: row.notification_cooldown_time ?? null,
    expiration_date: row.expiration_date ? new Date(row.expiration_date) : null,
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
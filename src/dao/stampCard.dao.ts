import { Pool } from "pg";
import { StampCard, CreateStampCardInput, UpdateStampCardInput } from "@/src/models/index.model";

const stampCardTableName = "stamp_card"

export type StampCardDAO = {
  getByID(id: string): Promise<StampCard | null>;
  updateByID(id: string, updates: UpdateStampCardInput): Promise<StampCard | null>;
  deleteByID(id: string): Promise<void>
}

export function createStampCardDAO(pool: Pool): StampCardDAO {
  return {
    async getByID(id: string): Promise<StampCard | null> {
      const sqlString = `
      SELECT
        id,
        user_id,
        nickname,
        vendor_place_id,
        vendor_name,
        vendor_address,
        vendor_lat,
        vendor_lng,
        geofence_radius,
        notify_window_days,
        notify_window_start_time,
        notify_window_end_time,
        notification_time_sent,
        notification_cooldown_time,
        notes,
        stamps_needed,
        stamps_acquired,
        expiration_date,
        created_at,
        updated_at,
        deleted,
        deleted_at
      FROM ${stampCardTableName}
      WHERE id = $1
      `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToStampCard(row)
    },

    async updateByID(id: string, updates: UpdateStampCardInput) {
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
      UPDATE ${stampCardTableName}
      SET ${setArgs.join(", ")}
      WHERE id = $${i}
      RETURNING *;
    `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToStampCard(row);
    },

    async deleteByID(id: string): Promise<void> {
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



type StampCardRow = {
  id: string;
  user_id: string;
  nickname?: string | null;
  vendor_place_id?: string | null;
  vendor_name?: string | null;
  vendor_address?: string | null;
  vendor_lat?: number | null;
  vendor_lng?: number | null;
  geofence_radius?: number | null;
  notify_window_days?: string[] | null;
  notify_window_start_time?: string | null;
  notify_window_end_time?: string | null;
  notification_time_sent?: string | null;
  notification_cooldown_time?: number | null;
  notes?: string | null;
  stamps_needed?: number;
  stamps_acquired?: number;
  expiration_date?: string | null;
  created_at: string;
  updated_at: string;
  deleted?: boolean | null;
  deleted_at?: string | null;
};

function mapDbRowToStampCard(row: StampCardRow): StampCard {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname ?? null,
    vendor_place_id: row.vendor_place_id ?? null,
    vendor_name: row.vendor_name ?? null,
    vendor_address: row.vendor_address ?? null,
    vendor_lat: row.vendor_lat ?? null,
    vendor_lng: row.vendor_lng ?? null,
    geofence_radius: row.geofence_radius ?? null,
    notify_window_days: row.notify_window_days ?? null,
    notify_window_start_time: row.notify_window_start_time ? new Date(row.notify_window_start_time) : null,
    notify_window_end_time: row.notify_window_end_time ? new Date(row.notify_window_end_time) : null,
    notification_time_sent: row.notification_time_sent ? new Date(row.notification_time_sent) : null,
    notification_cooldown_time: row.notification_cooldown_time ?? null,
    notes: row.notes ?? null,
    stamps_needed: row.stamps_needed ?? 0,
    stamps_acquired: row.stamps_acquired ?? 0,
    expiration_date: row.expiration_date ? new Date(row.expiration_date) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
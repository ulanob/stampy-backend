import { Pool } from "pg";
import { Notification, CreateNotificationInput, UpdateNotificationInput } from "@/src/models/index.model";

const notificationTableName = "notifications"

export type NotificationDAO = {
  createNotification(fields: CreateNotificationInput): Promise<Notification | null>;
  getNotificationByID(id: string): Promise<Notification | null>;
  getAllNotificationsByUserID(user_id: string): Promise<Notification[]>;
  updateNotificationByID(id: string, updates: UpdateNotificationInput): Promise<Notification | null>;
}

export function createNotificationDAO(pool: Pool): NotificationDAO {
  return {
    async createNotification(fields: CreateNotificationInput): Promise<Notification | null> {

      const sqlString = `
      INSERT INTO ${notificationTableName}
        (
        user_id,
        stamp_card_id,
        gift_card_id,
        location_id,
        type,
        subject,
        body
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        ${notificationColumns}`

      const inputs = [
        fields.user_id,
        fields.stamp_card_id,
        fields.gift_card_id,
        fields.location_id,
        fields.type,
        fields.subject,
        fields.body
      ]

      const result = await pool.query(sqlString, inputs)
      const row = result.rows[0]
      if (!row) return null;


      return mapDbRowToNotification(row);
    },

    async getNotificationByID(id: string): Promise<Notification | null> {
      const sqlString = `
        SELECT ${notificationColumns}
        FROM ${notificationTableName}
        WHERE id = $1
      `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToNotification(row)
    },

    async getAllNotificationsByUserID(user_id: string): Promise<Notification[]> {
      const sqlString = `
        SELECT ${notificationColumns}
        FROM ${notificationTableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      
      const result = await pool.query(sqlString, [user_id])

      return  result.rows.map(row => mapDbRowToNotification(row))
    },

    async updateNotificationByID(id: string, updates: UpdateNotificationInput) {
      const setArgs: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];

      let i = 1;

      // Safe: keys are derived from typed UpdateNotificationInput, not raw user input
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
      UPDATE ${notificationTableName}
      SET ${setArgs.join(", ")},
      updated_at = NOW()
      WHERE id = $${i}
      RETURNING *;
    `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToNotification(row);
    }
  }
}

const notificationColumns = `
  id,
  user_id,
  stamp_card_id,
  gift_card_id,
  location_id,
  type,
  status,
  sent_at,
  subject,
  body,
  created_at,
  updated_at
`

type NotificationRow = {
  id: string;
  user_id: string;
  stamp_card_id: string | null;
  gift_card_id: string | null;
  location_id: string | null;
  type: string;
  status: string;
  sent_at: Date | null;
  subject: string | null;
  body: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapDbRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    stamp_card_id: row.stamp_card_id,
    gift_card_id: row.gift_card_id,
    location_id: row.location_id,
    type: row.type,
    status: row.status,
    sent_at: row.sent_at,
    subject: row.subject,
    body: row.body,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
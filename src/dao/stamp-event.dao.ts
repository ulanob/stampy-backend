import { Pool } from "pg";
import { StampEvent, CreateStampEventInput } from "@/src/models/index.model";

const stampEventTableName = "stamp_events"

export type StampEventDAO = {
  createStampEvent(fields: CreateStampEventInput): Promise<StampEvent>;
  getAllStampEvents(limit?: number, offset?: number): Promise<StampEvent[]>;
  getStampEventsByStampCardID(stamp_card_id: string): Promise<StampEvent[]>;
  getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]>
}

export function createStampEventDAO(pool: Pool): StampEventDAO {
  return {
    async createStampEvent(fields: CreateStampEventInput): Promise<StampEvent> {

      const sqlString = `
      INSERT INTO ${stampEventTableName}
        (user_id,
        stamp_card_id,
        location_id,
        quantity)
      VALUES ($1, $2, $3, $4)
      RETURNING
        ${stampEventColumns}`

      const inputs = [
        fields.user_id,
        fields.stamp_card_id,
        fields.location_id,
        fields.quantity
      ]

      const result = await pool.query(sqlString, inputs)
      return mapDbRowToStampEvent(result.rows[0]);
    },

    async getAllStampEvents(limit: number = 50, offset: number = 0): Promise<StampEvent[]> {
      const sqlString = `
        SELECT ${stampEventColumns}
        FROM ${stampEventTableName}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;`

      const result = await pool.query(sqlString, [limit, offset])
      const rows = result.rows;

      return rows.map(row => mapDbRowToStampEvent(row));
    },

    async getStampEventsByStampCardID(stamp_card_id: string): Promise<StampEvent[]> {
      const sqlString = `
        SELECT ${stampEventColumns}
        FROM ${stampEventTableName}
        WHERE stamp_card_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [stamp_card_id])
      return result.rows.map(row => mapDbRowToStampEvent(row))

    },

    async getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]> {
      const sqlString = `
        SELECT ${stampEventColumns}
        FROM ${stampEventTableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [user_id])
      return result.rows.map(row => mapDbRowToStampEvent(row))
    }
  }
}

const stampEventColumns = `
  id,
  user_id,
  stamp_card_id,
  location_id,
  quantity,
  created_at
`

function mapDbRowToStampEvent(row: StampEvent): StampEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    stamp_card_id: row.stamp_card_id,
    location_id: row.location_id,
    quantity: row.quantity,
    created_at: new Date(row.created_at)
  };
}
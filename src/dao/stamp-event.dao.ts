import { Pool } from "pg";
import { StampEvent, CreateStampEventInput } from "@/src/models/index.model";
import { Executor } from "./types";

const stampEventTableName = "stamp_events"

export type StampEventDAO = {
  createStampEvent(fields: CreateStampEventInput, executor: Executor): Promise<StampEvent>;
  getAllStampEvents(limit?: number, offset?: number): Promise<StampEvent[]>;
  getStampEventsByStampCardID(stamp_card_id: string): Promise<StampEvent[]>;
  getStampEventByRequestID(request_id: string, executor?: Executor):Promise<StampEvent | null>;
  getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]>
}

export function createStampEventDAO(pool: Pool): StampEventDAO {
  return {
    async createStampEvent(fields: CreateStampEventInput, executor: Executor): Promise<StampEvent> {

      const sqlString = `
      INSERT INTO ${stampEventTableName}
        (user_id,
        stamp_card_id,
        location_id,
        request_id,
        type,
        quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${stampEventColumns}`

      const inputs = [
        fields.user_id,
        fields.stamp_card_id,
        fields.location_id,
        fields.request_id,
        fields.type,
        fields.quantity
      ]

      const result = await executor.query(sqlString, inputs)
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

    async getStampEventByRequestID(request_id: string, executor: Executor = pool): Promise<StampEvent | null> {
      const sqlString = `
        SELECT ${stampEventColumns}
        FROM ${stampEventTableName}
        WHERE request_id = $1
      `;
      const result = await executor.query(sqlString, [request_id]);
      const row = result.rows[0];
      if (!row) return null;
      return mapDbRowToStampEvent(row);
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
  request_id,
  type,
  quantity,
  created_at
`

function mapDbRowToStampEvent(row: StampEvent): StampEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    stamp_card_id: row.stamp_card_id,
    location_id: row.location_id,
    request_id: row.request_id,
    type: row.type,
    quantity: row.quantity,
    created_at: new Date(row.created_at)
  };
}
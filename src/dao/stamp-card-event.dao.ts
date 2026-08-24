import { Pool } from "pg";
import { StampCardEvent, CreateStampCardEventInput } from "@/src/models/index.model";
import { Executor } from "./types";

const stampCardEventTableName = "stamp_card_events"

export type StampCardEventDAO = {
  createStampCardEvent(fields: CreateStampCardEventInput, executor: Executor): Promise<StampCardEvent>;
  getAllStampCardEvents(limit?: number, offset?: number): Promise<StampCardEvent[]>;
  getStampCardEventsByStampCardID(stamp_card_id: string): Promise<StampCardEvent[]>;
  getStampCardEventByRequestID(request_id: string, executor?: Executor):Promise<StampCardEvent | null>;
  getAllStampCardEventsByUserID(user_id: string): Promise<StampCardEvent[]>
}

export function createStampCardEventDAO(pool: Pool): StampCardEventDAO {
  return {
    async createStampCardEvent(fields: CreateStampCardEventInput, executor: Executor): Promise<StampCardEvent> {

      const sqlString = `
      INSERT INTO ${stampCardEventTableName}
        (user_id,
        stamp_card_id,
        location_id,
        request_id,
        type,
        quantity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${stampCardEventColumns}`

      const inputs = [
        fields.user_id,
        fields.stamp_card_id,
        fields.location_id,
        fields.request_id,
        fields.type,
        fields.quantity
      ]

      const result = await executor.query(sqlString, inputs)
      return mapDbRowToStampCardEvent(result.rows[0]);
    },

    async getAllStampCardEvents(limit: number = 50, offset: number = 0): Promise<StampCardEvent[]> {
      const sqlString = `
        SELECT ${stampCardEventColumns}
        FROM ${stampCardEventTableName}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;`

      const result = await pool.query(sqlString, [limit, offset])
      const rows = result.rows;

      return rows.map(row => mapDbRowToStampCardEvent(row));
    },

    async getStampCardEventsByStampCardID(stamp_card_id: string): Promise<StampCardEvent[]> {
      const sqlString = `
        SELECT ${stampCardEventColumns}
        FROM ${stampCardEventTableName}
        WHERE stamp_card_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [stamp_card_id])
      return result.rows.map(row => mapDbRowToStampCardEvent(row))

    },

    async getStampCardEventByRequestID(request_id: string, executor: Executor = pool): Promise<StampCardEvent | null> {
      const sqlString = `
        SELECT ${stampCardEventColumns}
        FROM ${stampCardEventTableName}
        WHERE request_id = $1
      `;
      const result = await executor.query(sqlString, [request_id]);
      const row = result.rows[0];
      if (!row) return null;
      return mapDbRowToStampCardEvent(row);
    },

    async getAllStampCardEventsByUserID(user_id: string): Promise<StampCardEvent[]> {
      const sqlString = `
        SELECT ${stampCardEventColumns}
        FROM ${stampCardEventTableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [user_id])
      return result.rows.map(row => mapDbRowToStampCardEvent(row))
    }
  }
}

const stampCardEventColumns = `
  id,
  user_id,
  stamp_card_id,
  location_id,
  request_id,
  type,
  quantity,
  created_at
`

function mapDbRowToStampCardEvent(row: StampCardEvent): StampCardEvent {
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
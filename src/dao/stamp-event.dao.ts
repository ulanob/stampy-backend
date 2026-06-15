import { Pool } from "pg";
import { StampEvent, CreateStampEventInput } from "@/src/models/index.model";

const stampEventTableName = "stamp_events"

export type StampEventDAO = {
  createStampEvent(fields: CreateStampEventInput): Promise<StampEvent | null>;
  getAllEvents(): Promise<StampEvent[]>;
  getStampEventsByCard(stamp_card_id: string): Promise<StampEvent[]>;
  getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]>
}

export function createStampEventDAO(pool: Pool): StampEventDAO {
  return {
    async createStampEvent(fields: CreateStampEventInput): Promise<StampEvent | null> {

      const sqlString = `
      INSERT INTO ${stampEventTableName}
        (user_id,
        stamp_card_id,
        quantity)
      VALUES ($1, $2, $3)
      RETURNING
        ${stampEventColumns}`

      const inputs = [
        fields.user_id,
        fields.stamp_card_id,
        fields.quantity
      ]

      const result = await pool.query(sqlString, inputs)
      const row = result.rows[0]
      if (!row) return null;


      return mapDbRowToStampEvent(row);
    },

    async getAllEvents(): Promise<StampEvent[]> {
      const sqlString = `
        SELECT ${stampEventColumns}
        FROM ${stampEventTableName}
        ORDER BY created_at DESC;`

      const result = await pool.query(sqlString)
      const rows = result.rows

      return rows.map(row => mapDbRowToStampEvent(row));
    },

    async getStampEventsByCard(stamp_card_id: string): Promise<StampEvent[]> {
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
  quantity,
  created_at
`

type StampEventRow = {
  id: string;
  user_id: string;
  stamp_card_id: string;
  quantity: number;
  created_at: Date;
};

function mapDbRowToStampEvent(row: StampEventRow): StampEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    stamp_card_id: row.stamp_card_id,
    quantity: row.quantity,
    created_at: new Date(row.created_at)
  };
}
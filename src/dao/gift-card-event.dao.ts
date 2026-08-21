import { Pool } from "pg";
import { GiftCardEvent, CreateGiftCardEventInput } from "@/src/models/index.model";
import { Executor } from "./types";

const giftCardEventTableName = "gift_card_events"

export type GiftCardEventDAO = {
  createGiftCardEvent(fields: CreateGiftCardEventInput, executor: Executor): Promise<GiftCardEvent>;
  getAllGiftCardEvents(limit?: number, offset?: number): Promise<GiftCardEvent[]>;
  getGiftCardEventsByGiftCardID(gift_card_id: string): Promise<GiftCardEvent[]>;
  getGiftCardEventByRequestID(request_id: string, executor?: Executor):Promise<GiftCardEvent | null>;
  getAllGiftCardEventsByUserID(user_id: string): Promise<GiftCardEvent[]>
}

export function createGiftCardEventDAO(pool: Pool): GiftCardEventDAO {
  return {
    async createGiftCardEvent(fields: CreateGiftCardEventInput, executor: Executor): Promise<GiftCardEvent> {

      const sqlString = `
      INSERT INTO ${giftCardEventTableName}
        (user_id,
        gift_card_id,
        location_id,
        request_id,
        type,
        amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${giftCardEventColumns}`

      const inputs = [
        fields.user_id,
        fields.gift_card_id,
        fields.location_id,
        fields.request_id,
        fields.type,
        fields.amount
      ]

      const result = await executor.query(sqlString, inputs)
      return mapDbRowToGiftCardEvent(result.rows[0]);
    },

    async getAllGiftCardEvents(limit: number = 50, offset: number = 0): Promise<GiftCardEvent[]> {
      const sqlString = `
        SELECT ${giftCardEventColumns}
        FROM ${giftCardEventTableName}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;`

      const result = await pool.query(sqlString, [limit, offset])
      const rows = result.rows;

      return rows.map(row => mapDbRowToGiftCardEvent(row));
    },

    async getGiftCardEventsByGiftCardID(gift_card_id: string): Promise<GiftCardEvent[]> {
      const sqlString = `
        SELECT ${giftCardEventColumns}
        FROM ${giftCardEventTableName}
        WHERE gift_card_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [gift_card_id])
      return result.rows.map(row => mapDbRowToGiftCardEvent(row))

    },

    async getGiftCardEventByRequestID(request_id: string, executor: Executor = pool): Promise<GiftCardEvent | null> {
      const sqlString = `
        SELECT ${giftCardEventColumns}
        FROM ${giftCardEventTableName}
        WHERE request_id = $1
      `;
      const result = await executor.query(sqlString, [request_id]);
      const row = result.rows[0];
      if (!row) return null;
      return mapDbRowToGiftCardEvent(row);
    },

    async getAllGiftCardEventsByUserID(user_id: string): Promise<GiftCardEvent[]> {
      const sqlString = `
        SELECT ${giftCardEventColumns}
        FROM ${giftCardEventTableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(sqlString, [user_id])
      return result.rows.map(row => mapDbRowToGiftCardEvent(row))
    }
  }
}

const giftCardEventColumns = `
  id,
  user_id,
  gift_card_id,
  location_id,
  request_id,
  type,
  amount,
  created_at
`

function mapDbRowToGiftCardEvent(row: GiftCardEvent): GiftCardEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    gift_card_id: row.gift_card_id,
    location_id: row.location_id,
    request_id: row.request_id,
    type: row.type,
    amount: row.amount,
    created_at: new Date(row.created_at)
  };
}
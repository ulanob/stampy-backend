import { Pool } from "pg";
import { Business, BusinessType, CreateBusinessInput, UpdateBusinessInput } from "../models/business.model";

const businessTableName = "businesses"

export type BusinessDAO = {
  createBusiness(fields: CreateBusinessInput): Promise<Business>;
  getAllBusinesses(includeDeleted?: boolean): Promise<Business[]>;
  getBusinessByID(id: string, includeDeleted?: boolean): Promise<Business | null>;
  updateBusinessByID(id: string, updates: UpdateBusinessInput): Promise<Business | null>;
  deleteBusinessByID(id: string): Promise<void>;
}

export function createBusinessDAO(pool: Pool): BusinessDAO {
  return {
    async createBusiness(fields: CreateBusinessInput): Promise<Business> {
      const sqlString = `
      INSERT INTO ${businessTableName}
        (name,
        type)
      VALUES ($1, $2)
      RETURNING
        ${businessColumns}`

      const inputs = [
        fields.name,
        fields.type
      ]

      const result = await pool.query(sqlString, inputs);

      return mapDbRowToBusiness(result.rows[0]);
    },

    async getAllBusinesses(includeDeleted: boolean = false): Promise<Business[]> {
      const sqlString = `
      SELECT
        ${businessColumns}
      FROM ${businessTableName}
      ${includeDeleted ? '' :
          'WHERE deleted = false'}
      ORDER BY created_at DESC;`

      const result = await pool.query(sqlString);
      const rows = result.rows;

      return rows.map(row => mapDbRowToBusiness(row));

    },

    async getBusinessByID(id: string, includeDeleted: boolean = false): Promise<Business | null> {
      const sqlString = `
          SELECT
            ${businessColumns}
          FROM ${businessTableName}
          WHERE id = $1
          ${includeDeleted ? '' : 'AND deleted = false'}
          `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToBusiness(row);
    },

    async updateBusinessByID(id: string, updates: UpdateBusinessInput) {
      const setArgs: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];
      
      let i = 1;

      // Safe: keys are derived from typed UpdateBusinessInput, not raw user input
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
          UPDATE ${businessTableName}
          SET ${setArgs.join(", ")},
          updated_at = NOW()
          WHERE id = $${i}
          RETURNING *;
        `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToBusiness(row);
    },

    async deleteBusinessByID(id: string): Promise<void> {
      const sqlString = `
      UPDATE ${businessTableName}
      SET
        deleted = true,
        deleted_at = NOW()
      WHERE id = $1;`

      await pool.query(sqlString, [id])
    }
  }
}

const businessColumns = `
  id,
  name,
  type,
  deleted,
  deleted_at,
  created_at,
  updated_at
`

function mapDbRowToBusiness(row: Business): Business {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
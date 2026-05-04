import { Pool } from "pg";
import { User, CreateUserInput, UpdateUserInput } from "@/src/models/index.model";

const userTableName = "users"

export type UserDAO = {
  createUser(fields: CreateUserInput): Promise<User | null>;
  getAllUsers(includeDeleted?: boolean): Promise<User[]>;
  getUserByID(id: string, includeDeleted?: boolean): Promise<User | null>;
  updateUserByID(id: string, updates: UpdateUserInput): Promise<User | null>;
  deleteUserByID(id: string): Promise<void>
}

export function createUserDAO(pool: Pool): UserDAO {
  return {
    async createUser(fields: CreateUserInput): Promise<User | null> {

      const sqlString = `
      INSERT INTO ${userTableName}
        (display_name,
        email,
        auth_provider_id,
        deleted,
        deleted_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        ${userColumns}`

      const inputs = [
        fields.display_name,
        fields.email,
        fields.auth_provider_id,
        false,
        null
      ]

      const result = await pool.query(sqlString, inputs)
      const row = result.rows[0]
      if (!row) return null;


      return mapDbRowToUser(row);
    },

    async getAllUsers(includeDeleted: boolean = false): Promise<User[]> {
      const sqlString = `
        SELECT ${userColumns}
        FROM ${userTableName}
        ${includeDeleted ? '' :
          'WHERE deleted = false'}
        ORDER BY created_at DESC;`

      const result = await pool.query(sqlString)
      const rows = result.rows

      return rows.map(row => mapDbRowToUser(row));
    },

    async getUserByID(id: string, includeDeleted: boolean = false): Promise<User | null> {
      const sqlString = `
        SELECT ${userColumns}
        FROM ${userTableName}
        WHERE id = $1
        ${includeDeleted ? '' : 'AND deleted = false'}
      `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToUser(row)
    },

    async updateUserByID(id: string, updates: UpdateUserInput) {
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
      UPDATE ${userTableName}
      SET ${setArgs.join(", ")},
      updated_at = NOW()
      WHERE id = $${i}
      RETURNING *;
    `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToUser(row);
    },

    async deleteUserByID(id: string): Promise<void> {
      const sqlString = `
      UPDATE ${userTableName}
      SET
        deleted = true,
        deleted_at = NOW()
      WHERE id = $1;`

      await pool.query(sqlString, [id])
    }
  }
}

const userColumns = `
  id,
  display_name,
  email,
  auth_provider_id,
  created_at,
  updated_at,
  deleted,
  deleted_at
`

type UserRow = {
  id: string;
  display_name: string | null;
  email: string;
  auth_provider_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
};

function mapDbRowToUser(row: UserRow): User {
  return {
    id: row.id,
    display_name: row.display_name,
    email: row.email,
    auth_provider_id: row.auth_provider_id,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
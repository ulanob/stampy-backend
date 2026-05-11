import { Pool } from "pg";
import { Location, CreateLocationInput, UpdateLocationInput } from "@/src/models/index.model";

const locationTableName = "locations"

export type LocationDAO = {
  createLocation(fields: CreateLocationInput): Promise<Location | null>;
  getAllLocations(includeDeleted?: boolean): Promise<Location[]>;
  getLocationByID(id: string, includeDeleted?: boolean): Promise<Location | null>;
  getLocationsByBusinessID(businessId: string, includeDeleted?: boolean): Promise<Location[]>;
  updateLocationByID(id: string, updates: UpdateLocationInput): Promise<Location | null>;
  deleteLocationByID(id: string): Promise<void>
}

export function createLocationDAO(pool: Pool): LocationDAO {
  return {
    async createLocation(fields: CreateLocationInput): Promise<Location | null> {

      const sqlString = `
      INSERT INTO ${locationTableName}
        (
        business_id,
        address,
        lat,
        lng,
        geofence_radius)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        ${locationColumns}`

      const inputs = [
        fields.business_id,
        fields.address,
        fields.lat,
        fields.lng,
        fields.geofence_radius
      ]

      const result = await pool.query(sqlString, inputs)
      const row = result.rows[0]
      if (!row) return null;


      return mapDbRowToLocation(row);
    },

    async getAllLocations(includeDeleted: boolean = false): Promise<Location[]> {
      const sqlString = `
        SELECT ${locationColumns}
        FROM ${locationTableName}
        ${includeDeleted ? '' :
          'WHERE deleted = false'}
        ORDER BY created_at DESC;`

      const result = await pool.query(sqlString)
      const rows = result.rows

      return rows.map(row => mapDbRowToLocation(row));
    },

    async getLocationByID(id: string, includeDeleted: boolean = false): Promise<Location | null> {
      const sqlString = `
        SELECT ${locationColumns}
        FROM ${locationTableName}
        WHERE id = $1
        ${includeDeleted ? '' : 'AND deleted = false'}
      `;

      const result = await pool.query(sqlString, [id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToLocation(row)
    },

    async getLocationsByBusinessID(businessId: string, includeDeleted: boolean = false): Promise<Location[]> {
      const sqlString = `
      SELECT ${locationColumns}
      FROM ${locationTableName}
      WHERE business_id = $1
      ${includeDeleted ? '' :
          'AND deleted = false'}
        ORDER BY created_at DESC;
      `

      const result = await pool.query(sqlString, [businessId])
      const rows = result.rows;

      return rows.map((row => mapDbRowToLocation(row)))
    },


    async updateLocationByID(id: string, updates: UpdateLocationInput) {
      const setArgs: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];

      let i = 1;

      // Safe: keys are derived from typed UpdateLocationInput, not raw user input
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
      UPDATE ${locationTableName}
      SET ${setArgs.join(", ")},
      updated_at = NOW()
      WHERE id = $${i}
      RETURNING *;
    `;
      values.push(id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToLocation(row);
    },

    async deleteLocationByID(id: string): Promise<void> {
      const sqlString = `
      UPDATE ${locationTableName}
      SET
        deleted = true,
        deleted_at = NOW()
      WHERE id = $1;`

      await pool.query(sqlString, [id])
    }
  }
}

const locationColumns = `
  id,
  business_id,
  address,
  lat,
  lng,
  geofence_radius,
  deleted,
  deleted_at,
  created_at,
  updated_at
`

type LocationRow = {
  id: string;
  business_id: string;
  address: string;
  lat: number;
  lng: number;
  geofence_radius: number;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapDbRowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    business_id: row.business_id,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    geofence_radius: row.geofence_radius,
    deleted: !!row.deleted,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
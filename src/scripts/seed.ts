import pool from '../lib/db'

async function seed() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // --- BUSINESSES ---
    const { rows: businesses } = await client.query(`
      INSERT INTO businesses (id, name, type)
      VALUES
        (gen_random_uuid(), 'Test Business 1', 'cafe'),
        (gen_random_uuid(), 'Test Business 2', 'retail')
      RETURNING id
    `)
    const [businessId1, businessId2] = businesses.map(b => b.id)

    // --- LOCATIONS ---
    const { rows: locations } = await client.query(`
      INSERT INTO locations (id, business_id, address, lat, lng, geofence_radius)
      VALUES
        (gen_random_uuid(), $1, '123 Main St', 49.2827, -123.1207, 100),
        (gen_random_uuid(), $2, '456 Main St', 49.2837, -123.1217, 100)
      RETURNING id
    `, [businessId1, businessId2])
    const [locationId1, locationId2] = locations.map(l => l.id)

    // --- USER ---
    const { rows: users } = await client.query(`
      INSERT INTO users (id, email)
      VALUES (gen_random_uuid(), 'testuser@example.com')
      RETURNING id
    `)
    const userId = users[0].id

    // --- USER NOTIFICATION PREFERENCES ---
    await client.query(`
      INSERT INTO user_notification_preferences (id, user_id, notifications_enabled, daily_notification_cap, daily_notification_counter)
      VALUES (gen_random_uuid(), $1, true, 5, 0)
    `, [userId])

    // --- STAMP CARDS ---
    await client.query(`
      INSERT INTO stamp_cards (id, user_id, business_id, location_id, stamps_needed, stamps_acquired)
      VALUES
        (gen_random_uuid(), $1, $2, $3, 10, 0),
        (gen_random_uuid(), $1, $4, $5, 8, 5)
    `, [userId, businessId1, locationId1, businessId2, locationId2])

    // --- GIFT CARDS ---
    await client.query(`
      INSERT INTO gift_cards (id, user_id, business_id, location_id, current_balance, initial_balance, currency)
      VALUES
        (gen_random_uuid(), $1, $2, $3, 5000, 5000, 'CAD'),
        (gen_random_uuid(), $1, $4, $5, 2500, 2500, 'CAD')
    `, [userId, businessId1, locationId1, businessId2, locationId2])

    await client.query('COMMIT')
    console.log('✅ Seed complete')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Seed failed, rolled back:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
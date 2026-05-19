import pool from "../lib/db";

export const TEST_IDS = {
  business1: 'a1b2c3d4-0000-0000-0000-000000000001',
  business2: 'a1b2c3d4-0000-0000-0000-000000000002',
  location1: 'a1b2c3d4-0000-0000-0000-000000000003',
  location2: 'a1b2c3d4-0000-0000-0000-000000000004',
  user1: 'a1b2c3d4-0000-0000-0000-000000000005',
  stampCard1: 'a1b2c3d4-0000-0000-0000-000000000006',
  stampCard2: 'a1b2c3d4-0000-0000-0000-000000000007',
  giftCard1: 'a1b2c3d4-0000-0000-0000-000000000008',
  giftCard2: 'a1b2c3d4-0000-0000-0000-000000000009',
  notificationPreferences1: 'a1b2c3d4-0000-0000-0000-000000000010',
  notification1: 'a1b2c3d4-0000-0000-0000-000000000011',
  notification2: 'a1b2c3d4-0000-0000-0000-000000000012',
} as const;

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --- BUSINESSES ---
    await client.query(`
      INSERT INTO businesses (id, name, type)
      VALUES
        ($1, 'Test Business 1', 'cafe'),
        ($2, 'Test Business 2', 'retail')
    `, [TEST_IDS.business1, TEST_IDS.business2]);

    // --- LOCATIONS ---
    await client.query(`
      INSERT INTO locations (id, business_id, address, lat, lng, geofence_radius)
      VALUES
        ($1, $2, '123 Main St', 49.2827, -123.1207, 100),
        ($3, $4, '456 Main St', 49.2837, -123.1217, 100)
    `, [TEST_IDS.location1, TEST_IDS.business1, TEST_IDS.location2, TEST_IDS.business2]);

    // --- USER ---
    await client.query(`
      INSERT INTO users (id, email)
      VALUES ($1, 'testuser@example.com')
    `, [TEST_IDS.user1]);

    // --- USER NOTIFICATION PREFERENCES ---
    await client.query(`
      INSERT INTO user_notification_preferences (id, user_id, notifications_enabled, daily_notification_cap, daily_notification_counter)
      VALUES ($1, $2, true, 5, 0)
    `, [TEST_IDS.notificationPreferences1, TEST_IDS.user1]);

    // --- STAMP CARDS ---
    await client.query(`
      INSERT INTO stamp_cards (id, user_id, business_id, location_id, stamps_needed, stamps_acquired)
      VALUES
        ($1, $2, $3, $4, 10, 0),
        ($5, $2, $6, $7, 8, 5)
    `, [TEST_IDS.stampCard1, TEST_IDS.user1, TEST_IDS.business1, TEST_IDS.location1,
        TEST_IDS.stampCard2, TEST_IDS.business2, TEST_IDS.location2]);

    // --- GIFT CARDS ---
    await client.query(`
      INSERT INTO gift_cards (id, user_id, business_id, location_id, current_balance, initial_balance, currency)
      VALUES
        ($1, $2, $3, $4, 5000, 5000, 'CAD'),
        ($5, $2, $6, $7, 2500, 2500, 'CAD')
    `, [TEST_IDS.giftCard1, TEST_IDS.user1, TEST_IDS.business1, TEST_IDS.location1,
        TEST_IDS.giftCard2, TEST_IDS.business2, TEST_IDS.location2]);

    // --- NOTIFICATIONS ---
    await client.query(`
      INSERT INTO notifications (id, user_id, stamp_card_id, gift_card_id, location_id, type, status, subject, body)
      VALUES
        ($1, $2, $3, null, $4, 'stamp_reminder', 'pending', 'You have stamps!', 'Come back and earn more stamps.'),
        ($5, $2, null, $6, $7, 'gift_card_expiry', 'pending', 'Gift card expiring soon', 'Your gift card expires soon.')
    `, [TEST_IDS.notification1, TEST_IDS.user1, TEST_IDS.stampCard1, TEST_IDS.location1,
        TEST_IDS.notification2, TEST_IDS.giftCard1, TEST_IDS.location2]);

    await client.query("COMMIT");
    console.log("✅ Test seed complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Test seed failed, rolled back:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

export async function clearAll() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM notifications");
    await client.query("DELETE FROM gift_cards");
    await client.query("DELETE FROM stamp_cards");
    await client.query("DELETE FROM user_notification_preferences");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM locations");
    await client.query("DELETE FROM businesses");
    await client.query("COMMIT");
    console.log("✅ Test DB cleared");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Clear failed, rolled back:", err);
  } finally {
    client.release();
  }
}

seed();
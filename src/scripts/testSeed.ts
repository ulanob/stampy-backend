import pool from "../lib/db";

export const TEST_IDS = {
  business1: 'a1b2c3d4-0000-0000-0000-000000000001',
  business2: 'a1b2c3d4-0000-0000-0000-000000000002',
  businessNonExistent: 'f1b2c3d4-0000-0000-0000-000000000022',
  location1: 'a1b2c3d4-0000-0000-0000-000000000003',
  location2: 'a1b2c3d4-0000-0000-0000-000000000004',
  locationNonExistent: 'f1b2c3d4-0000-0000-0000-000000000023',
  user1: 'a1b2c3d4-0000-0000-0000-000000000005',
  userNonExistent: 'f1b2c3d4-0000-0000-0000-000000000024',
  stampCard1: 'a1b2c3d4-0000-0000-0000-000000000006',
  stampCard2: 'a1b2c3d4-0000-0000-0000-000000000007',
  stampCardNonExistent: 'f1b2c3d4-0000-0000-0000-000000000033',
  giftCard1: 'a1b2c3d4-0000-0000-0000-000000000008',
  giftCard2: 'a1b2c3d4-0000-0000-0000-000000000009',
  giftCardNonExistent: 'f1b2c3d4-0000-0000-0000-000000000044',
  notificationPreferences1: 'a1b2c3d4-0000-0000-0000-000000000010',
  notification1: 'a1b2c3d4-0000-0000-0000-000000000011',
  notification2: 'a1b2c3d4-0000-0000-0000-000000000012',
  stampCardEvent1: 'a1b2c3d4-0000-0000-0000-000000000013',
  stampCardEvent2: 'a1b2c3d4-0000-0000-0000-000000000014',
  giftCardEvent1: 'a1b2c3d4-0000-0000-0000-000000000015',
  giftCardEvent2: 'a1b2c3d4-0000-0000-0000-000000000016',
} as const;

export async function seed() {
  console.log("🌱 Starting seed...");

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
      VALUES ($1, $2, true, 3, 0)
    `, [TEST_IDS.notificationPreferences1, TEST_IDS.user1]);

    // --- STAMP CARDS ---
    await client.query(`
      INSERT INTO stamp_cards (id, user_id, business_id, stamps_needed, stamps_acquired, status)
      VALUES
        ($1, $2, $3, 10, 0, 'active'),
        ($4, $2, $5, 8, 5, 'active')
    `, [TEST_IDS.stampCard1, TEST_IDS.user1, TEST_IDS.business1,
        TEST_IDS.stampCard2, TEST_IDS.business2]);


    // --- STAMP CARD EVENTS ---
    await client.query(`
      INSERT INTO stamp_card_events (id, stamp_card_id, user_id, location_id, request_id, type, quantity)
      VALUES
        ($1, $3, $5, $6, $8, 'stamp_added', 1),
        ($2, $4, $5, $7, $9, 'stamp_added', 2)
    `,
      [
        TEST_IDS.stampCardEvent1, TEST_IDS.stampCardEvent2,
        TEST_IDS.stampCard1, TEST_IDS.stampCard2,
        TEST_IDS.user1,
        TEST_IDS.location1, TEST_IDS.location2,
        crypto.randomUUID(), crypto.randomUUID(), 
      ]
    );

    // --- GIFT CARDS ---
    await client.query(`
      INSERT INTO gift_cards (id, user_id, business_id, currency, status)
      VALUES
        ($1, $2, $3, 'CAD', 'active'),
        ($4, $2, $5, 'CAD', 'active')
    `, [TEST_IDS.giftCard1, TEST_IDS.user1, TEST_IDS.business1,
        TEST_IDS.giftCard2, TEST_IDS.business2]);

    // --- GIFT CARD EVENTS ---
    await client.query(`
      INSERT INTO gift_card_events (id, gift_card_id, user_id, location_id, request_id, type, amount)
      VALUES
        ($1, $3, $5, $6, $8, 'balance_added', 50.00),
        ($2, $4, $5, $7, $9, 'balance_added', 25.00)
    `,
      [
        TEST_IDS.giftCardEvent1, TEST_IDS.giftCardEvent2,
        TEST_IDS.giftCard1, TEST_IDS.giftCard2,
        TEST_IDS.user1,
        TEST_IDS.location1, TEST_IDS.location2,
        crypto.randomUUID(), crypto.randomUUID(),
      ]
    );

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
  }
}

export async function clearAll() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM notifications");
    await client.query("DELETE FROM gift_card_events");
    await client.query("DELETE FROM gift_cards");
    await client.query("DELETE FROM stamp_card_events");
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
import pool from "../lib/db";

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --- BUSINESSES ---
    const { rows: businesses } = await client.query(`
      INSERT INTO businesses (id, name, type)
      VALUES
        (gen_random_uuid(), 'Test Business 1', 'cafe'),
        (gen_random_uuid(), 'Test Business 2', 'retail')
      RETURNING id
    `);
    const [businessId1, businessId2] = businesses.map((b) => b.id);

    // --- LOCATIONS ---
    const { rows: locations } = await client.query(
      `
      INSERT INTO locations (id, business_id, address, lat, lng, geofence_radius)
      VALUES
        (gen_random_uuid(), $1, '123 Main St', 49.2827, -123.1207, 100),
        (gen_random_uuid(), $2, '456 Main St', 49.2837, -123.1217, 100)
      RETURNING id
    `,
      [businessId1, businessId2],
    );
    const [locationId1, locationId2] = locations.map((l) => l.id);

    // --- USER ---
    const { rows: users } = await client.query(`
      INSERT INTO users (id, email)
      VALUES (gen_random_uuid(), 'testuser@example.com')
      RETURNING id
    `);
    const userId = users[0].id;

    // --- USER NOTIFICATION PREFERENCES ---
    await client.query(
      `
        INSERT INTO user_notification_preferences (id, user_id, notifications_enabled, daily_notification_cap, daily_notification_counter)
        VALUES (gen_random_uuid(), $1, true, 5, 0)
      `,
      [userId],
    );

    // --- STAMP CARDS ---
    const { rows: stampCards } = await client.query(
      `
        INSERT INTO stamp_cards (id, user_id, business_id, stamps_needed, stamps_acquired, status)
        VALUES
          (gen_random_uuid(), $1, $2, 10, 0, 'active'),
          (gen_random_uuid(), $1, $3, 8, 5, 'active')
        RETURNING id
      `,
      [userId, businessId1, businessId2],
    );
    const [stampCardId1, stampCardId2] = stampCards.map((s) => s.id);

    // --- STAMP CARD EVENTS ---
    await client.query(
      `
      INSERT INTO stamp_card_events (id, stamp_card_id, user_id, location_id, request_id, type, quantity)
      VALUES
        (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), 'stamp_added', 1),
        (gen_random_uuid(), $4, $2, $5, gen_random_uuid(), 'stamp_added', 2)
    `,
      [stampCardId1, userId, locationId1, stampCardId2, locationId2],
    );

    // --- GIFT CARDS ---
    const { rows: giftCards } = await client.query(
      `
        INSERT INTO gift_cards (id, user_id, business_id, current_balance, initial_balance, currency, status)
        VALUES
          (gen_random_uuid(), $1, $2, 50.00, 50.00, 'CAD', 'active'),
          (gen_random_uuid(), $1, $3, 25.00, 25.00, 'CAD', 'active')
        RETURNING id
      `,
      [userId, businessId1, businessId2],
    );
    const [giftCardId1, giftCardId2] = giftCards.map((g) => g.id);

    // --- GIFT CARD EVENTS ---
    await client.query(
      `
      INSERT INTO gift_card_events (id, gift_card_id, user_id, location_id, request_id, type, amount)
      VALUES
        (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), 'balance_added', 50.00),
        (gen_random_uuid(), $4, $2, $5, gen_random_uuid(), 'balance_added', 25.00)
    `,
      [giftCardId1, userId, locationId1, giftCardId2, locationId2],
    );

    // --- NOTIFICATIONS ---
    await client.query(
      `
        INSERT INTO notifications (user_id, stamp_card_id, gift_card_id, location_id, type, status, subject, body)
        VALUES
          ($1, $2, null, $3, 'stamp_reminder', 'pending', 'You have stamps!', 'Come back and earn more stamps.'),
          ($1, null, $4, $5, 'gift_card_expiry', 'pending', 'Gift card expiring soon', 'Your gift card expires soon.')
      `,
      [userId, stampCardId1, locationId1, giftCardId1, locationId2],
    );

    await client.query("COMMIT");
    console.log("✅ Seed complete");
    console.log({
      businessId1,
      businessId2,
      locationId1,
      locationId2,
      userId,
      stampCardId1,
      stampCardId2,
      giftCardId1,
      giftCardId2,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed, rolled back:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool, { withTransaction } from '../../lib/db';
import { createNotificationDAO, createUserNotificationPreferencesDAO } from '../../dao';
import type { CreateNotificationInput } from '../../models/notification.model';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('recordNotificationsSent', () => {
  const preferencesDAO = createUserNotificationPreferencesDAO(pool);

  test('round-trips counter and last_notified_date', async () => {
    const lastNotified = new Date('2026-06-15T12:00:00.000Z');

    const returned = await withTransaction(pool, async (client) => {
      const locked = await preferencesDAO.getUserNotificationPreferencesForUpdate(
        TEST_IDS.user1,
        client,
      );
      expect(locked?.user_id).toBe(TEST_IDS.user1);

      return preferencesDAO.recordNotificationsSent(
        TEST_IDS.user1,
        { counter: 2, last_notified_date: lastNotified },
        client,
      );
    });

    // RETURNING is mapped
    expect(returned?.daily_notification_counter).toBe(2);
    expect(returned?.last_notified_date?.getTime()).toBe(lastNotified.getTime());

    // and persisted
    const fetched = await preferencesDAO.getUserNotificationPreferencesByUserID(TEST_IDS.user1);
    expect(fetched?.daily_notification_counter).toBe(2);
    expect(fetched?.last_notified_date?.getTime()).toBe(lastNotified.getTime());
  });
});

describe('createNotification with an executor', () => {
  const notificationDAO = createNotificationDAO(pool);

  const input: CreateNotificationInput = {
    user_id: TEST_IDS.user1,
    stamp_card_id: null,
    gift_card_id: null,
    location_id: null,
    type: 'stamp_reminder',
    subject: 'executor test',
    body: 'executor test',
  };

  async function countBySubject() {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE subject = 'executor test'`,
    );
    return Number(rows[0].count);
  }

  test('persists when the transaction commits', async () => {
    const before = await countBySubject();
    await withTransaction(pool, (client) => notificationDAO.createNotification(input, client));
    expect(await countBySubject()).toBe(before + 1);
  });

  test('persists nothing when the transaction rolls back', async () => {
    const before = await countBySubject();

    await expect(
      withTransaction(pool, async (client) => {
        await notificationDAO.createNotification(input, client);
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');

    expect(await countBySubject()).toBe(before);
  });
});

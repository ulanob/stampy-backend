import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createNotificationDAO } from '../../dao';
import { NOTIFICATION_STATUSES } from '../../models/notification.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('notifications routes', () => {
  describe('GET /notifications/:id', () => {
    test('returns a notification', async () => {
      const response = await request(BASE_URL)
        .get(`/api/v1/notifications/${TEST_IDS.notification1}`)
        .expect(200);
      expect(response.body.id).toBe(TEST_IDS.notification1);
    });

    test('returns 400 for an invalid id', async () => {
      await request(BASE_URL).get('/api/v1/notifications/999999').expect(400);
    });

    test('returns 404 for a non-existent notification', async () => {
      // no notificationNonExistent in TEST_IDS; a random UUID is equivalent
      await request(BASE_URL)
        .get(`/api/v1/notifications/${crypto.randomUUID()}`)
        .expect(404);
    });
  });

  describe('GET /users/:userId/notifications', () => {
    test('returns the seeded notifications for a user', async () => {
      const response = await request(BASE_URL)
        .get(`/api/v1/users/${TEST_IDS.user1}/notifications`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: TEST_IDS.notification1 }),
          expect.objectContaining({ id: TEST_IDS.notification2 }),
        ])
      );
    });

    test('returns an empty array for a user with no notifications', async () => {
      const { body: user } = await request(BASE_URL)
        .post('/api/v1/users')
        .send({
          email: 'no-notifications@example.com',
          display_name: null,
          auth_provider_id: null,
          timezone: 'America/Vancouver',
        })
        .expect(201);

      const response = await request(BASE_URL)
        .get(`/api/v1/users/${user.id}/notifications`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('returns 404 for a non-existent user', async () => {
      await request(BASE_URL)
        .get(`/api/v1/users/${TEST_IDS.userNonExistent}/notifications`)
        .expect(404);
    });

    test('returns 400 for an invalid user id', async () => {
      await request(BASE_URL).get('/api/v1/users/not-a-uuid/notifications').expect(400);
    });
  });

  describe('POST /notifications/:id/read', () => {
    test('marks a notification as read', async () => {
      const response = await request(BASE_URL)
        .post(`/api/v1/notifications/${TEST_IDS.notification1}/read`)
        .expect(200);

      expect(response.body.id).toBe(TEST_IDS.notification1);
      expect(response.body.status).toBe('read');
    });

    test('is idempotent: marking an already-read notification returns it again', async () => {
      await request(BASE_URL)
        .post(`/api/v1/notifications/${TEST_IDS.notification2}/read`)
        .expect(200);

      const second = await request(BASE_URL)
        .post(`/api/v1/notifications/${TEST_IDS.notification2}/read`)
        .expect(200);

      expect(second.body.status).toBe('read');
    });

    test('persists: a later GET shows the read status', async () => {
      const response = await request(BASE_URL)
        .get(`/api/v1/notifications/${TEST_IDS.notification1}`)
        .expect(200);
      expect(response.body.status).toBe('read');
    });

    test('returns 400 for an invalid id', async () => {
      await request(BASE_URL).post('/api/v1/notifications/999999/read').expect(400);
    });

    test('returns 404 for a non-existent notification', async () => {
      await request(BASE_URL)
        .post(`/api/v1/notifications/${crypto.randomUUID()}/read`)
        .expect(404);
    });
  });
});

// Drift guard: exercises the real CHECK constraint for every value in the
// TS const. If a status is added to NOTIFICATION_STATUSES but not to
// init.sql (or vice versa), this fails. Goes through the DAO since no
// HTTP route accepts arbitrary statuses anymore.
describe('notification status: TS enum <-> SQL CHECK constraint', () => {
  const notificationDAO = createNotificationDAO(pool);

  test.each(NOTIFICATION_STATUSES)('DAO accepts status %s', async (status) => {
    const updated = await notificationDAO.updateNotificationByID(
      TEST_IDS.notification2,
      { status }
    );
    expect(updated?.status).toBe(status);
  });

  test('database rejects a status outside the enum', async () => {
    await expect(
      pool.query(
        'UPDATE notifications SET status = $1 WHERE id = $2',
        ['banana', TEST_IDS.notification2]
      )
    ).rejects.toThrow();
  });
});
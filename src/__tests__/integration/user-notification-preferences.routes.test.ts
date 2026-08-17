import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('user notification preferences routes', () => {
  test('GET /:userId returns preferences for a user', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.user1}/preferences`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        user_id: TEST_IDS.user1,
        notifications_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        notify_window_days: null,
        general_notification_window_start: null,
        general_notification_window_end: null,
        daily_notification_cap: 3,
        daily_notification_counter: 0,
        last_notified_date: null,
      })
    );
  });

  test('GET /:userId returns 404 for a non-existent user', async () => {
    await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.userNonExistent}/preferences`)
      .expect(404);
  });

  test('GET /:userId returns 400 for an invalid UUID', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/users/not-a-uuid/preferences')
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /:userId updates preferences', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/users/${TEST_IDS.user1}/preferences`)
      .send({ notifications_enabled: false })
      .expect(200);

    expect(response.body.notifications_enabled).toBe(false);

    // reset for test isolation, since this file shares TEST_IDS.user1 across tests
    await request(BASE_URL)
      .patch(`/api/v1/users/${TEST_IDS.user1}/preferences`)
      .send({ notifications_enabled: true });
  });

  test('PATCH /:userId rejects an empty body', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/users/${TEST_IDS.user1}/preferences`)
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /:userId returns 404 for a non-existent user', async () => {
    await request(BASE_URL)
      .patch(`/api/v1/users/${TEST_IDS.userNonExistent}/preferences`)
      .send({ notifications_enabled: false })
      .expect(404);
  });

  test('PATCH /:userId returns 400 for an invalid UUID', async () => {
    const response = await request(BASE_URL)
      .patch('/api/v1/users/not-a-uuid/preferences')
      .send({ notifications_enabled: false })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
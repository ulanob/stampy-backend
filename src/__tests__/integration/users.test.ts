import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateUserInput } from '../../models/user.model';
import { createUserService } from '../../services/user.service';
import { createUserDAO } from '../../dao';
import pool from '../../lib/db';
import type { UserNotificationPreferencesDAO } from '../../dao';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

const tempUser: CreateUserInput = {
  email: 'temp-user@example.com',
  display_name: null,
  auth_provider_id: null,
};

async function createUser(payload: CreateUserInput = tempUser) {
  return request(BASE_URL)
    .post('/api/v1/users')
    .send(payload)
    .expect(201);
}

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('users', () => {
  test('GET /api/v1/users returns a list of users', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/users')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: TEST_IDS.user1 }),
      ])
    );
  });

  test('GET /api/v1/users/:id returns a user', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.user1}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ id: TEST_IDS.user1 })
    );
  });

  test('GET /api/v1/users/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .get('/api/v1/users/999999')
      .expect(400);
  });

  test('GET /api/v1/users/:id returns 404 for user not found', async () => {
    await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.userNonExistent}`)
      .expect(404);
  });

  test('GET /api/v1/users/:id returns 404 for deleted user', async () => {
    const { body: created } = await createUser({ email: 'to-be-deleted@example.com', display_name: null, auth_provider_id: null });

    await request(BASE_URL)
      .delete(`/api/v1/users/${created.id}`)
      .expect(204);

    await request(BASE_URL)
      .get(`/api/v1/users/${created.id}`)
      .expect(404);
  });

  test('POST /api/v1/users creates a user', async () => {
    const body: CreateUserInput = { email: 'new-user@example.com', display_name: null, auth_provider_id: null };

    const response = await request(BASE_URL)
      .post('/api/v1/users')
      .send(body)
      .set('Accept', 'application/json')
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({ email: 'new-user@example.com', display_name: null, auth_provider_id: null })
    );
  });

  test('POST /api/v1/users also creates default notification preferences', async () => {
    const { body: created } = await createUser({ email: 'prefs-check@example.com', display_name: null, auth_provider_id: null });

    const response = await request(BASE_URL)
      .get(`/api/v1/users/${created.id}/preferences`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        user_id: created.id,
        notifications_enabled: true,
      })
    );
  });

  test('POST /api/v1/users rejects missing email', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/users')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /api/v1/users/:id updates a user', async () => {
    const { body: created } = await createUser({ email: 'to-be-updated@example.com', display_name: null, auth_provider_id: null });

    const response = await request(BASE_URL)
      .patch(`/api/v1/users/${created.id}`)
      .send({ display_name: 'Updated Name' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ display_name: 'Updated Name' })
    );
  });

  test('PATCH /api/v1/users/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .patch('/api/v1/users/999999')
      .send({ display_name: 'doesnt-matter' })
      .expect(400);
  });

  test('PATCH /api/v1/users/:id returns 404 for user not found', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/users/${TEST_IDS.userNonExistent}`)
      .send({ display_name: 'doesnt-matter' })
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /api/v1/users/:id ignores email even if included in the body', async () => {
    const { body: created } = await createUser({ email: 'original@example.com', display_name: null, auth_provider_id: null });

    const response = await request(BASE_URL)
      .patch(`/api/v1/users/${created.id}`)
      .send({ email: 'hacked@evil.com', display_name: 'New Name' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: 'original@example.com',
        display_name: 'New Name',
      })
    );
  });

  test('DELETE /api/v1/users/:id deletes a user', async () => {
    const { body: created } = await createUser({ email: 'to-be-deleted-2@example.com', display_name: null, auth_provider_id: null });

    await request(BASE_URL)
      .delete(`/api/v1/users/${created.id}`)
      .expect(204);
  });

  test('DELETE /api/v1/users/:id returns 404 for user not found', async () => {
    const response = await request(BASE_URL)
      .delete(`/api/v1/users/${TEST_IDS.userNonExistent}`)
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('DELETE /api/v1/users/:id returns 400 for already deleted user', async () => {
    const { body: created } = await createUser({ email: 'to-be-deleted-3@example.com', display_name: null, auth_provider_id: null });

    await request(BASE_URL)
      .delete(`/api/v1/users/${created.id}`)
      .expect(204);

    const response = await request(BASE_URL)
      .delete(`/api/v1/users/${created.id}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });


  // exception: test atomicity of createUser in user.service.ts
  describe('createUser — transaction rollback', () => {
    test('does not persist a user when the preferences insert fails', async () => {
      const userDAO = createUserDAO(pool);
      const brokenPreferencesDAO: UserNotificationPreferencesDAO = {
        createUserNotificationPreferences: async () => {
          throw new Error('forced failure');
        },
        getUserNotificationPreferencesByUserID: async () => null,
        updateUserNotificationPreferencesByUserID: async () => null,
      };
      const service = createUserService(userDAO, brokenPreferencesDAO, pool);

      await expect(
        service.createUser({
          email: 'rollback-test@example.com',
          display_name: null,
          auth_provider_id: null,
        })
      ).rejects.toThrow('forced failure');

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['rollback-test@example.com']
      );
      expect(result.rows.length).toBe(0);
    });
  });
});
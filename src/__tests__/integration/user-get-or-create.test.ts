import { seed, clearAll } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createUserService } from '../../services/user.service';
import { createUserDAO, createUserNotificationPreferencesDAO } from '../../dao';
import { AccountDeletedError } from '../../utils/validators';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('getOrCreateUserByAuthId — real DB', () => {
  const service = createUserService(
    createUserDAO(pool),
    createUserNotificationPreferencesDAO(pool),
    pool,
  );

  test('concurrent first logins with the same sub create exactly one user and one preferences row', async () => {
    const sub = `cognito-sub-${crypto.randomUUID()}`;

    const results = await Promise.all(
      Array.from({ length: 5 }, () => service.getOrCreateUserByAuthId(sub)),
    );

    expect(new Set(results.map((u) => u.id)).size).toBe(1);

    const users = await pool.query('SELECT id FROM users WHERE auth_provider_id = $1', [sub]);
    expect(users.rows.length).toBe(1);

    const prefs = await pool.query(
      'SELECT id FROM user_notification_preferences WHERE user_id = $1',
      [results[0].id],
    );
    expect(prefs.rows.length).toBe(1);
  });

  test('a repeat login returns the same user', async () => {
    const sub = `cognito-sub-${crypto.randomUUID()}`;
    const first = await service.getOrCreateUserByAuthId(sub);
    const second = await service.getOrCreateUserByAuthId(sub);
    expect(second.id).toBe(first.id);
  });

  test('a soft-deleted user is rejected, not recreated', async () => {
    const sub = `cognito-sub-${crypto.randomUUID()}`;
    const user = await service.getOrCreateUserByAuthId(sub);
    await service.deleteUserByID(user.id);

    await expect(service.getOrCreateUserByAuthId(sub)).rejects.toThrow(AccountDeletedError);

    const rows = await pool.query('SELECT id FROM users WHERE auth_provider_id = $1', [sub]);
    expect(rows.rows.length).toBe(1);
  });
});

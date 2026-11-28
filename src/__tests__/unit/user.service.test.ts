import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserService } from '../../services/user.service';
import type { UserDAO, UserNotificationPreferencesDAO } from '../../dao';
import type { Pool, PoolClient } from 'pg';
import { AccountDeletedError, ValidationError, InvalidEmailError } from '../../utils/validators';
import { USERS_AUTH_PROVIDER_ID_INDEX } from '../../lib/db';

describe('userService.getOrCreateUserByAuthId', () => {
  let userDAO: UserDAO;
  let prefsDAO: UserNotificationPreferencesDAO;
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;

  const sub = 'cognito-sub-123';
  const baseUser = {
    id: 'a1b2c3d4-0000-0000-0000-000000000005',
    email: null,
    display_name: null,
    auth_provider_id: sub,
    timezone: 'UTC',
    deleted: false,
  };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    userDAO = {
      getUserByAuthProviderID: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(baseUser),
    } as unknown as UserDAO;

    prefsDAO = {
      createUserNotificationPreferences: vi.fn().mockResolvedValue({}),
    } as unknown as UserNotificationPreferencesDAO;
  });

  function service() {
    return createUserService(userDAO, prefsDAO, mockPool as Pool);
  }

  function uniqueViolation(constraint: string) {
    return Object.assign(new Error('duplicate key'), { code: '23505', constraint });
  }

  it('returns the existing user without creating anything', async () => {
    (userDAO.getUserByAuthProviderID as any).mockResolvedValue(baseUser);

    const result = await service().getOrCreateUserByAuthId(sub);

    expect(result).toBe(baseUser);
    expect(userDAO.getUserByAuthProviderID).toHaveBeenCalledWith(sub, true);
    expect(userDAO.createUser).not.toHaveBeenCalled();
  });

  it('creates the user and default preferences in one transaction when none exists', async () => {
    const result = await service().getOrCreateUserByAuthId(sub);

    expect(result).toEqual(baseUser);
    expect(userDAO.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ auth_provider_id: sub, email: null }),
      mockClient,
    );
    expect(prefsDAO.createUserNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: baseUser.id, notifications_enabled: true }),
      mockClient,
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects a soft-deleted user with AccountDeletedError and does not create a new one', async () => {
    (userDAO.getUserByAuthProviderID as any).mockResolvedValue({ ...baseUser, deleted: true });

    await expect(service().getOrCreateUserByAuthId(sub)).rejects.toThrow(AccountDeletedError);
    expect(userDAO.createUser).not.toHaveBeenCalled();
  });

  it('re-reads and returns the winner when it loses a race on the auth_provider_id index', async () => {
    (userDAO.getUserByAuthProviderID as any)
      .mockResolvedValueOnce(null) // initial lookup
      .mockResolvedValueOnce(baseUser); // re-read after 23505
    (userDAO.createUser as any).mockRejectedValue(uniqueViolation(USERS_AUTH_PROVIDER_ID_INDEX));

    const result = await service().getOrCreateUserByAuthId(sub);

    expect(result).toBe(baseUser);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(userDAO.getUserByAuthProviderID).toHaveBeenCalledTimes(2);
  });

  it('rejects when the race winner was soft-deleted in the meantime', async () => {
    (userDAO.getUserByAuthProviderID as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...baseUser, deleted: true });
    (userDAO.createUser as any).mockRejectedValue(uniqueViolation(USERS_AUTH_PROVIDER_ID_INDEX));

    await expect(service().getOrCreateUserByAuthId(sub)).rejects.toThrow(AccountDeletedError);
  });

  it('propagates a unique violation on a different constraint (e.g. email)', async () => {
    const emailViolation = uniqueViolation('users_email_key');
    (userDAO.createUser as any).mockRejectedValue(emailViolation);

    await expect(service().getOrCreateUserByAuthId(sub)).rejects.toBe(emailViolation);
    expect(userDAO.getUserByAuthProviderID).toHaveBeenCalledTimes(1); // no re-read
  });

  it('propagates non-unique-violation errors', async () => {
    (userDAO.createUser as any).mockRejectedValue(new Error('connection lost'));

    await expect(service().getOrCreateUserByAuthId(sub)).rejects.toThrow('connection lost');
  });

  it.each(['', '   '])('throws ValidationError for blank sub %j', async (blank) => {
    await expect(service().getOrCreateUserByAuthId(blank)).rejects.toThrow(ValidationError);
    expect(userDAO.getUserByAuthProviderID).not.toHaveBeenCalled();
  });
});

describe('userService.createUser', () => {
  let userDAO: UserDAO;
  let prefsDAO: UserNotificationPreferencesDAO;
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;

  const baseFields = {
    email: null,
    display_name: null,
    auth_provider_id: null,
    timezone: 'America/Vancouver',
  };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    userDAO = {
      createUser: vi.fn().mockResolvedValue({ id: 'a1b2c3d4-0000-0000-0000-000000000005' }),
    } as unknown as UserDAO;

    prefsDAO = {
      createUserNotificationPreferences: vi.fn().mockResolvedValue({}),
    } as unknown as UserNotificationPreferencesDAO;
  });

  function service() {
    return createUserService(userDAO, prefsDAO, mockPool as Pool);
  }

  it('rejects an empty-string email with InvalidEmailError', async () => {
    await expect(service().createUser({ ...baseFields, email: '' })).rejects.toThrow(
      InvalidEmailError,
    );
    expect(userDAO.createUser).not.toHaveBeenCalled();
  });

  it('rejects a user with neither email nor auth_provider_id', async () => {
    await expect(service().createUser(baseFields)).rejects.toThrow(ValidationError);
    expect(userDAO.createUser).not.toHaveBeenCalled();
  });

  it('allows a user with no email when auth_provider_id is provided', async () => {
    await service().createUser({ ...baseFields, auth_provider_id: 'cognito-sub-123' });

    expect(userDAO.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: null, auth_provider_id: 'cognito-sub-123' }),
      mockClient,
    );
    expect(prefsDAO.createUserNotificationPreferences).toHaveBeenCalled();
  });
});

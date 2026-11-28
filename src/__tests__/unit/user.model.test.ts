import { describe, it, expect } from 'vitest';
import { toUserResponse, type User } from '../../models/user.model';

describe('toUserResponse', () => {
  const user: User = {
    id: 'a1b2c3d4-0000-0000-0000-000000000005',
    display_name: 'Boris',
    email: 'boris@example.com',
    auth_provider_id: 'cognito-sub-123',
    timezone: 'America/Vancouver',
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-02T00:00:00Z'),
    deleted: false,
    deleted_at: null,
  };

  it('keeps the fields a user needs about themselves', () => {
    expect(toUserResponse(user)).toEqual({
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      timezone: user.timezone,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  });

  it('does not expose internal fields', () => {
    const response = toUserResponse(user);
    expect(response).not.toHaveProperty('auth_provider_id');
    expect(response).not.toHaveProperty('deleted');
    expect(response).not.toHaveProperty('deleted_at');
  });
});

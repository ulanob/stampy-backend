// src/__tests__/unit/timezone.service.test.ts
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createTimezoneService } from '../../services/timezone.service';
import { resolveTimezones, type TimezoneResolver } from '../../lib/timezone';
import type { UserDAO } from '../../dao';
import { NotFoundError, ValidationError, InvalidUUIDError } from '../../utils/validators';

describe('timezoneService.correctUserTimezone', () => {
  let userDAO: UserDAO;
  let resolver: Mock<TimezoneResolver>;

  const userId = 'a1b2c3d4-0000-0000-0000-000000000005';
  const baseUser = { id: userId, timezone: 'America/Vancouver' };

  beforeEach(() => {
    userDAO = {
      getUserByID: vi.fn().mockResolvedValue(baseUser),
      updateUserByID: vi
        .fn()
        .mockImplementation(async (_id, updates) => ({ ...baseUser, ...updates })),
    } as unknown as UserDAO;
    resolver = vi.fn<TimezoneResolver>().mockResolvedValue(['America/Vancouver']);
  });

  function service() {
    return createTimezoneService(userDAO, resolver);
  }

  it('leaves the timezone alone when it matches the resolved zone', async () => {
    expect(await service().correctUserTimezone(userId, 49.28, -123.12)).toBe('America/Vancouver');
    expect(userDAO.updateUserByID).not.toHaveBeenCalled();
  });

  it('leaves the timezone alone when it is one of several resolved candidates', async () => {
    resolver.mockResolvedValue(['America/Toronto', 'America/Vancouver']);
    await service().correctUserTimezone(userId, 49.28, -123.12);
    expect(userDAO.updateUserByID).not.toHaveBeenCalled();
  });

  it('corrects a drifted timezone to the first resolved zone and returns it', async () => {
    resolver.mockResolvedValue(['America/Toronto']);
    const result = await service().correctUserTimezone(userId, 43.65, -79.38);

    expect(result).toBe('America/Toronto');
    expect(userDAO.updateUserByID).toHaveBeenCalledWith(userId, { timezone: 'America/Toronto' });
  });

  it('keeps the stored timezone when nothing resolves (open ocean)', async () => {
    resolver.mockResolvedValue([]);
    expect(await service().correctUserTimezone(userId, 0, 0)).toBe('America/Vancouver');
    expect(userDAO.updateUserByID).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the user doesn't exist, without resolving", async () => {
    (userDAO.getUserByID as any).mockResolvedValue(null);
    await expect(service().correctUserTimezone(userId, 49.28, -123.12)).rejects.toThrow(
      NotFoundError,
    );
    expect(resolver).not.toHaveBeenCalled();
  });

  it('throws InvalidUUIDError for a malformed user_id', async () => {
    await expect(service().correctUserTimezone('not-a-uuid', 49.28, -123.12)).rejects.toThrow(
      InvalidUUIDError,
    );
    expect(userDAO.getUserByID).not.toHaveBeenCalled();
  });

  it('throws ValidationError for out-of-range coordinates', async () => {
    await expect(service().correctUserTimezone(userId, 200, 0)).rejects.toThrow(ValidationError);
    expect(userDAO.getUserByID).not.toHaveBeenCalled();
  });
});

// Smoke test against the real geo-tz dataset
describe('resolveTimezones (real geo-tz)', () => {
  it('resolves Vancouver coordinates', async () => {
    expect(await resolveTimezones(49.2827, -123.1207)).toContain('America/Vancouver');
  });
});

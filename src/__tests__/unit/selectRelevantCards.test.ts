import { describe, it, expect } from 'vitest';
import { selectRelevantCards } from '../../services/notification-eligibility/selectRelevantCards';
import type { StampCard } from '../../models/stamp-card.model';
import type { GiftCard } from '../../models/gift-card.model';

const BUSINESS_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const OTHER_BUSINESS_ID = 'a1b2c3d4-0000-0000-0000-000000000002';
const USER_ID = 'a1b2c3d4-0000-0000-0000-000000000005';

function stampCard(overrides: Partial<StampCard> = {}): StampCard {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000006',
    user_id: USER_ID,
    business_id: BUSINESS_ID,
    nickname: null,
    notes: null,
    stamps_needed: 10,
    stamps_acquired: 3,
    status: 'active',
    notify_window_days: null,
    notify_window_start_time: null,
    notify_window_end_time: null,
    notification_time_sent: null,
    notification_cooldown_seconds: null,
    expiration_date: null,
    deleted: false,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function giftCard(overrides: Partial<GiftCard> = {}): GiftCard {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000008',
    user_id: USER_ID,
    business_id: BUSINESS_ID,
    nickname: null,
    notes: null,
    current_balance: 25,
    currency: 'CAD',
    status: 'active',
    notify_window_days: null,
    notify_window_start_time: null,
    notify_window_end_time: null,
    notification_time_sent: null,
    notification_cooldown_seconds: null,
    expiration_date: null,
    deleted: false,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('selectRelevantCards', () => {
  it('returns an empty array when there are no cards', () => {
    expect(selectRelevantCards(BUSINESS_ID, [], [])).toEqual([]);
  });

  describe('business matching', () => {
    it('excludes stamp cards for a different business', () => {
      const result = selectRelevantCards(
        BUSINESS_ID,
        [stampCard({ business_id: OTHER_BUSINESS_ID })],
        [],
      );
      expect(result).toEqual([]);
    });

    it('excludes gift cards for a different business', () => {
      const result = selectRelevantCards(
        BUSINESS_ID,
        [],
        [giftCard({ business_id: OTHER_BUSINESS_ID })],
      );
      expect(result).toEqual([]);
    });

    it('keeps only the matching business when cards for several businesses are mixed', () => {
      const mine = stampCard({ id: 'mine' });
      const theirs = stampCard({ id: 'theirs', business_id: OTHER_BUSINESS_ID });

      const result = selectRelevantCards(BUSINESS_ID, [mine, theirs], []);

      expect(result).toEqual([{ type: 'stamp_card', card: mine }]);
    });
  });

  describe('stamp cards', () => {
    it('includes an active card with at least one stamp', () => {
      const card = stampCard({ status: 'active', stamps_acquired: 1 });
      expect(selectRelevantCards(BUSINESS_ID, [card], [])).toEqual([{ type: 'stamp_card', card }]);
    });

    it('excludes an active card with zero stamps', () => {
      const card = stampCard({ status: 'active', stamps_acquired: 0 });
      expect(selectRelevantCards(BUSINESS_ID, [card], [])).toEqual([]);
    });

    it('includes a completed card (a reward is waiting)', () => {
      const card = stampCard({ status: 'completed', stamps_acquired: 10 });
      expect(selectRelevantCards(BUSINESS_ID, [card], [])).toEqual([{ type: 'stamp_card', card }]);
    });

    it.each(['redeemed', 'expired', 'cancelled'] as const)(
      'excludes a %s card even when it has stamps',
      (status) => {
        const card = stampCard({ status, stamps_acquired: 10 });
        expect(selectRelevantCards(BUSINESS_ID, [card], [])).toEqual([]);
      },
    );
  });

  describe('gift cards', () => {
    it('includes an active card with a positive balance', () => {
      const card = giftCard({ status: 'active', current_balance: 0.01 });
      expect(selectRelevantCards(BUSINESS_ID, [], [card])).toEqual([{ type: 'gift_card', card }]);
    });

    it('excludes an active card with a zero balance', () => {
      const card = giftCard({ status: 'active', current_balance: 0 });
      expect(selectRelevantCards(BUSINESS_ID, [], [card])).toEqual([]);
    });

    it.each(['expired', 'cancelled'] as const)(
      'excludes a %s card even when it has a balance',
      (status) => {
        const card = giftCard({ status, current_balance: 50 });
        expect(selectRelevantCards(BUSINESS_ID, [], [card])).toEqual([]);
      },
    );
  });

  it('returns stamp cards first, then gift cards, each tagged with its type', () => {
    const stamp = stampCard({ id: 'stamp-1' });
    const gift = giftCard({ id: 'gift-1' });

    const result = selectRelevantCards(BUSINESS_ID, [stamp], [gift]);

    expect(result).toEqual([
      { type: 'stamp_card', card: stamp },
      { type: 'gift_card', card: gift },
    ]);
  });

  it('does not filter on expiration_date (ExpirationCheck owns that rule)', () => {
    const card = giftCard({ expiration_date: new Date('2000-01-01T00:00:00Z') });
    expect(selectRelevantCards(BUSINESS_ID, [], [card])).toEqual([{ type: 'gift_card', card }]);
  });
});

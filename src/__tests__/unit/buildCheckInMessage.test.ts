import { describe, it, expect } from 'vitest';
import { buildCheckInMessage } from '../../services/buildCheckInMessage';

const stamp = (card: object) =>
  ({
    type: 'stamp_card',
    card: { status: 'active', stamps_acquired: 4, stamps_needed: 10, ...card },
  }) as any;
const gift = (card: object) =>
  ({ type: 'gift_card', card: { currency: 'CAD', current_balance: 2.54, ...card } }) as any;

describe('buildCheckInMessage', () => {
  it('describes an in-progress stamp card', () => {
    expect(buildCheckInMessage([stamp({})]).body).toBe('1 stamp card with 4/10 stamps');
  });

  it('describes a completed stamp card as ready to redeem', () => {
    expect(buildCheckInMessage([stamp({ status: 'completed', stamps_acquired: 10 })]).body).toBe(
      '1 stamp card ready to be redeemed',
    );
  });

  it('formats gift card balances with cents', () => {
    expect(buildCheckInMessage([gift({})]).body).toBe('1 gift card with $2.54');
    expect(buildCheckInMessage([gift({ current_balance: 50 })]).body).toBe(
      '1 gift card with $50.00',
    );
  });

  it("joins different cards with ' / ' in first-seen order", () => {
    const body = buildCheckInMessage([
      stamp({ status: 'completed', stamps_acquired: 10 }),
      stamp({}),
      gift({}),
    ]).body;
    expect(body).toBe(
      '1 stamp card ready to be redeemed / 1 stamp card with 4/10 stamps / 1 gift card with $2.54',
    );
  });

  it('collapses identical descriptions into a count', () => {
    const done = stamp({ status: 'completed', stamps_acquired: 10 });
    expect(buildCheckInMessage([done, done]).body).toBe('2 stamp cards ready to be redeemed');
  });

  it('does not collapse stamp cards at different progress', () => {
    expect(buildCheckInMessage([stamp({}), stamp({ stamps_acquired: 7 })]).body).toBe(
      '1 stamp card with 4/10 stamps / 1 stamp card with 7/10 stamps',
    );
  });
});

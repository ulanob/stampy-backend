import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createStampCardDAO, createGiftCardDAO } from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

const stampCardDAO = createStampCardDAO(pool);
const giftCardDAO = createGiftCardDAO(pool);

const cases = [
  {
    name: 'stamp_cards',
    id: TEST_IDS.stampCard1,
    claim: stampCardDAO.claimNotification,
  },
  {
    name: 'gift_cards',
    id: TEST_IDS.giftCard1,
    claim: giftCardDAO.claimNotification,
  },
];

// ms precision on purpose: JS Dates can't carry Postgres' microseconds
const T1 = new Date('2026-06-15T12:00:00.123Z');
const T2 = new Date('2026-06-15T13:00:00.456Z');

describe.each(cases)('claimNotification — $name', ({ name, id, claim }) => {
  async function stored(): Promise<Date | null> {
    const { rows } = await pool.query(`SELECT notification_time_sent FROM ${name} WHERE id = $1`, [
      id,
    ]);
    return rows[0].notification_time_sent;
  }

  async function setStored(value: Date | null) {
    await pool.query(`UPDATE ${name} SET notification_time_sent = $1 WHERE id = $2`, [value, id]);
  }

  beforeEach(async () => {
    await setStored(null);
  });

  test('succeeds on a never-notified card when observed is null', async () => {
    expect(await claim(id, null, T1, pool)).toBe(true);
  });

  test('succeeds when the stored value matches observed', async () => {
    await setStored(T1);
    expect(await claim(id, T1, T2, pool)).toBe(true);
  });

  test('returns false when the stored value does not match observed', async () => {
    await setStored(T1);

    expect(await claim(id, null, T2, pool)).toBe(false);
    expect(await claim(id, T2, T2, pool)).toBe(false);
    expect((await stored())?.getTime()).toBe(T1.getTime()); // untouched
  });

  test('second claim with the same observed loses (the race in miniature)', async () => {
    expect(await claim(id, null, T1, pool)).toBe(true);
    expect(await claim(id, null, T2, pool)).toBe(false);
  });

  test('concurrent claims with the same observed produce exactly one winner', async () => {
    const results = await Promise.all([claim(id, null, T1, pool), claim(id, null, T2, pool)]);

    expect(results.filter((result) => result)).toHaveLength(1);

    // The database must contain the timestamp from whichever claim won.
    const winnerIndex = results.findIndex((result) => result);
    const expectedTimestamp = [T1, T2][winnerIndex];

    expect((await stored())?.getTime()).toBe(expectedTimestamp.getTime());
  });

  test('writes the value it was given', async () => {
    await claim(id, null, T1, pool);
    expect((await stored())?.getTime()).toBe(T1.getTime());
  });
});

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

function checkIn(locationId: string, payload: object) {
  return request(BASE_URL).post(`/api/v1/locations/${locationId}/check-in`).send(payload);
}

describe('check-in route', () => {
  test('POST returns 204 for a valid user at a valid location', async () => {
    const response = await checkIn(TEST_IDS.location1, { user_id: TEST_IDS.user1 }).expect(204);
    expect(response.body).toEqual({});
  });

  test('POST returns 400 for a malformed location id', async () => {
    await checkIn('not-a-uuid', { user_id: TEST_IDS.user1 }).expect(400);
  });

  test('POST returns 400 when user_id is missing', async () => {
    const response = await checkIn(TEST_IDS.location1, {}).expect(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST returns 400 for a literal null body (not a 500)', async () => {
    const response = await request(BASE_URL)
      .post(`/api/v1/locations/${TEST_IDS.location1}/check-in`)
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST returns 400 for a malformed user_id', async () => {
    await checkIn(TEST_IDS.location1, { user_id: 'not-a-uuid' }).expect(400);
  });

  test('POST returns 404 for a non-existent location', async () => {
    const response = await checkIn(TEST_IDS.locationNonExistent, {
      user_id: TEST_IDS.user1,
    }).expect(404);
    expect(response.body.error).toBeDefined();
  });

  test('POST returns 404 for a non-existent user', async () => {
    const response = await checkIn(TEST_IDS.location1, {
      user_id: TEST_IDS.userNonExistent,
    }).expect(404);
    expect(response.body.error).toBeDefined();
  });

  test('POST returns 404 for a soft-deleted location', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/locations')
      .send({
        business_id: TEST_IDS.business1,
        address: 'Temp',
        lat: 1,
        lng: 1,
        geofence_radius: 50,
      })
      .expect(201);

    await request(BASE_URL).delete(`/api/v1/locations/${created.id}`).expect(204);

    await checkIn(created.id, { user_id: TEST_IDS.user1 }).expect(404);
  });

  test('POST returns 404 for a soft-deleted user', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/users')
      .send({
        email: 'checkin-deleted@example.com',
        display_name: null,
        auth_provider_id: null,
        timezone: 'America/Vancouver',
      })
      .expect(201);

    await request(BASE_URL).delete(`/api/v1/users/${created.id}`).expect(204);

    await checkIn(TEST_IDS.location1, { user_id: created.id }).expect(404);
  });
});

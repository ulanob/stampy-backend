import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateLocationInput } from '@/src/models/location.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

const tempLocation: CreateLocationInput = {
  business_id: TEST_IDS.business1,
  address: 'Temp Location',
  lat: 1,
  lng: 1,
  geofence_radius: 50,
};

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('locations', () => {
  test('GET /api/v1/locations returns a list of locations', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/locations')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: TEST_IDS.location1 }),
        expect.objectContaining({ id: TEST_IDS.location2 }),
      ])
    );
  });

  test('GET /api/v1/locations/:id returns a location', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/locations/${TEST_IDS.location1}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ id: TEST_IDS.location1 })
    );
  });

  test('GET /api/v1/locations/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .get('/api/v1/locations/999999')
      .expect(400);
  });

  test('GET /api/v1/locations/:id returns 404 for location not found', async () => {
    await request(BASE_URL)
      .get(`/api/v1/locations/${TEST_IDS.locationNonExistent}`)
      .expect(404);
  });

  test('GET /api/v1/locations/:id returns 404 for already deleted location', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/locations')
      .send(tempLocation)
      .expect(201);

    await request(BASE_URL).delete(`/api/v1/locations/${created.id}`).expect(204);

    await request(BASE_URL).get(`/api/v1/locations/${created.id}`).expect(404);
  });

  test('POST /api/v1/locations posts a location', async () => {
    const body: CreateLocationInput = {
      business_id: TEST_IDS.business1,
      address: '1234 Test Location',
      lat: 123,
      lng: 234,
      geofence_radius: 127,
    };

    const response = await request(BASE_URL)
      .post('/api/v1/locations')
      .send(body)
      .set('Accept', 'application/json')
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        business_id: TEST_IDS.business1,
        address: '1234 Test Location',
        lat: 123,
        lng: 234,
        geofence_radius: 127,
      })
    );
  });

  test('POST /api/v1/locations rejects invalid payload', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/locations')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /api/v1/locations/:id updates lat value', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/locations')
      .send(tempLocation)
      .expect(201);

    const response = await request(BASE_URL)
      .patch(`/api/v1/locations/${created.id}`)
      .send({ lat: 500 })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ lat: 500 })
    );
  });

  test('PATCH /api/v1/locations/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .patch('/api/v1/locations/999999')
      .send({ lat: 500 })
      .expect(400);
  });

  test('PATCH /api/v1/locations/:id returns 404 for location not found', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/locations/${TEST_IDS.locationNonExistent}`)
      .send({ lat: 500 })
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('DELETE /api/v1/locations/:id deletes a location', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/locations')
      .send(tempLocation)
      .expect(201);

    await request(BASE_URL)
      .delete(`/api/v1/locations/${created.id}`)
      .expect(204);
  });

  test('DELETE /api/v1/locations/:id returns 404 for location not found', async () => {
    const response = await request(BASE_URL)
      .delete(`/api/v1/locations/${TEST_IDS.locationNonExistent}`)
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('DELETE /api/v1/locations/:id returns 400 for already deleted location', async () => {
    const { body: created } = await request(BASE_URL)
      .post('/api/v1/locations')
      .send(tempLocation)
      .expect(201);

    await request(BASE_URL).delete(`/api/v1/locations/${created.id}`).expect(204);

    const response = await request(BASE_URL)
      .delete(`/api/v1/locations/${created.id}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
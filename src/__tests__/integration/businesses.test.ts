import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateBusinessInput } from "../../models/business.model";


const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});


describe('businesses', () => {
  test('GET /api/v1/businesses returns a list of businesses', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/businesses')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: TEST_IDS.business1 }),
        expect.objectContaining({ id: TEST_IDS.business2 }),
      ])
    );
  });

  test('GET /api/v1/businesses/:id returns a business', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.business1}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: TEST_IDS.business1,
      })
    );
  });

  test('GET /api/v1/businesses/:id returns 400 for Invalid ID format', async () => {
    await request(BASE_URL)
      .get('/api/v1/businesses/999999')
      .expect(400);
  });

  test('GET /api/v1/businesses/:id returns 404 for Business not found', async () => {
    await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
      .expect(404);
  });

  test('POST /api/v1/businesses posts a business', async () => {
    const body: CreateBusinessInput = { 
      name: "Test Restaurant", 
      type: "restaurant"
    }
    const response = await request(BASE_URL)
    .post('/api/v1/businesses')
    .send(body)
    .set('Accept', 'application/json')
    .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({name: "Test Restaurant", type: "restaurant"})
    )
  })

  test('POST /api/v1/business/:id rejects invalid business type', async () => {
    const requestBody = {
      name: "Test Restaurant",
      type: "travel"
    }

    const response = await request(BASE_URL)
    .post(`/api/v1/businesses`)
    .send(requestBody)
    .expect(400);

    expect(response.body.error).toBeDefined();
  })

  test('POST /api/v1/businesses rejects invalid payload', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/businesses')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('UPDATE /api/v1/business/:id updates valid type of business with matching id', async () => {
    const requestBody = {
      type: "cafe"
    }
    const response = await request(BASE_URL)
    .patch(`/api/v1/businesses/${TEST_IDS.business1}`)
    .send(requestBody)
    .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({name: 'Test Business 1', type: 'cafe'})
    )
  })

  test('UPDATE /api/v1/business/:id rejects invalid type update', async () => {
    const requestBody = {
      type: "travel"
    }
    const response = await request(BASE_URL)
    .patch(`/api/v1/businesses/${TEST_IDS.business1}`)
    .send(requestBody)
    .expect(400);

    expect(response.body.error).toBeDefined();
  })

  test('DELETE /api/v1/business/:id deletes a business', async () => {
    await request(BASE_URL)
    .delete(`/api/v1/businesses/${TEST_IDS.business1}`)
    .expect(204);
  })

  test('DELETE /api/v1/businesses/:id returns 404 for Business not found', async () => {
    const response = await request(BASE_URL)
    .delete(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
    .expect(404);

    expect(response.body.error).toBeDefined()
  })

  test('DELETE /api/v1/businesses/:id returns 400 for Business already deleted', async () => {
    // delete it first
    await request(BASE_URL)
      .delete(`/api/v1/businesses/${TEST_IDS.business2}`)
      .expect(204);

    // then try to delete again
    const response = await request(BASE_URL)
      .delete(`/api/v1/businesses/${TEST_IDS.business2}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
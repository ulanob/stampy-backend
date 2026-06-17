import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateLocationInput } from '@/src/models/location.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

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
        expect.objectContaining({
          id: TEST_IDS.location1,
        })
      );
    });
  
    test('GET /api/v1/locations/:id returns 400 for Invalid ID format', async () => {
      await request(BASE_URL)
        .get('/api/v1/locations/999999')
        .expect(400);
    });
  
    test('GET /api/v1/locations/:id returns 404 for location not found', async () => {
      await request(BASE_URL)
        .get(`/api/v1/locations/${TEST_IDS.locationNonExistent}`)
        .expect(404);
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
      )
    })
  
    test('POST /api/v1/locations rejects invalid payload', async () => {
      const response = await request(BASE_URL)
        .post('/api/v1/locations')
        .send({})
        .expect(400);
  
      expect(response.body.error).toBeDefined();
    });
  
    test('UPDATE /api/v1/location/:id updates lat value with matching id', async () => {
      const requestBody = { lat: 500 }

      const response = await request(BASE_URL)
      .patch(`/api/v1/locations/${TEST_IDS.location1}`)
      .send(requestBody)
      .expect(200);
  
      expect(response.body).toEqual(
        expect.objectContaining({ lat: 500 })
      )
    })
  
    test('DELETE /api/v1/location/:id deletes a location', async () => {
      await request(BASE_URL)
      .delete(`/api/v1/locations/${TEST_IDS.location1}`)
      .expect(204);
    })
  
    test('DELETE /api/v1/locations/:id returns 404 for location not found', async () => {
      const response = await request(BASE_URL)
      .delete(`/api/v1/locations/${TEST_IDS.locationNonExistent}`)
      .expect(404);
  
      expect(response.body.error).toBeDefined()
    })
  
    test('DELETE /api/v1/locations/:id returns 400 for location already deleted', async () => {
      // delete it first
      await request(BASE_URL)
        .delete(`/api/v1/locations/${TEST_IDS.location2}`)
        .expect(204);
  
      // then try to delete again
      const response = await request(BASE_URL)
        .delete(`/api/v1/locations/${TEST_IDS.location2}`)
        .expect(400);
  
      expect(response.body.error).toBeDefined();

    });
    
    test('GET /api/v1/locations/:id returns 404 for location already deleted', async () => {
        await request(BASE_URL)
          .get(`/api/v1/locations/${TEST_IDS.location2}`)
          .expect(404);
    });
});
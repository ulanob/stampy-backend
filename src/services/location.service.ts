import { BusinessDAO, LocationDAO } from '../dao';
import { Location, CreateLocationInput, UpdateLocationInput, } from '../models/location.model';
import { NotFoundError, validateUUID, ValidationError, } from '../utils/validators';
import { assertExists, requireFields, validateCoordinates, validateRadius } from './helpers.service';

export type LocationService = {
  createLocation(fields: CreateLocationInput): Promise<Location>;
  getAllLocations(includeDeleted?: boolean): Promise<Location[]>;
  getLocationByID(id: string, includeDeleted?: boolean): Promise<Location>;
  getLocationsByBusinessID(business_id: string, includeDeleted?: boolean): Promise<Location[]>;
  updateLocationByID(id: string, updates: UpdateLocationInput): Promise<Location>;
  deleteLocationByID(id: string): Promise<void>;
};

export function createLocationService(locationDAO: LocationDAO, businessDAO: BusinessDAO): LocationService {
  return {
    async createLocation(fields: CreateLocationInput): Promise<Location> {
      // check required fields
      requireFields(fields, ["address", "business_id", "geofence_radius", "lat", "lng"])

      validateUUID(fields.business_id);
      validateCoordinates(fields.lat, fields.lng)
      validateRadius(fields.geofence_radius)

      await assertExists(
        () => businessDAO.getBusinessByID(fields.business_id),
        'Business not found'
      );

      return await locationDAO.createLocation(fields);
    },

    async getLocationByID(id: string, includeDeleted: boolean = false): Promise<Location> {
      validateUUID(id);

      const fetchedLocation = await locationDAO.getLocationByID(id, includeDeleted);

      if (!fetchedLocation) {
        throw new NotFoundError('Could not find location');
      }

      return fetchedLocation;
    },

    async getLocationsByBusinessID(business_id: string, includeDeleted: boolean = false): Promise<Location[]> {
      validateUUID(business_id);

      await assertExists(
        () => businessDAO.getBusinessByID(business_id),
        'Business not found'
      );

      const fetchedLocations = await locationDAO.getLocationsByBusinessID(business_id, includeDeleted);

      if (fetchedLocations.length <= 0) {
        throw new NotFoundError('Could not find locations');
      }

      return fetchedLocations;
    },

    async getAllLocations(includeDeleted: boolean = false): Promise<Location[]>{
      return locationDAO.getAllLocations(includeDeleted)
    },

    async updateLocationByID(
      id: string,
      updates: UpdateLocationInput
    ): Promise<Location> {
      validateUUID(id);

      // check if there are updates
      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No fields to update');
      }

      // validate lat & lng, 0 value edge case
      const latProvided = updates.lat !== undefined;
      const lngProvided = updates.lng !== undefined;

      if (latProvided && lngProvided) {
        validateCoordinates(updates.lat!, updates.lng!)
      } else if (latProvided || lngProvided) {
        throw new ValidationError('lat & lng need to be updated at the same time')
      }

      if (updates.geofence_radius !== undefined) {
        validateRadius(updates.geofence_radius)
      }

      const updatedLocation = await locationDAO.updateLocationByID(id, updates);

      if (!updatedLocation) {
        throw new NotFoundError('Could not find location to update');
      }

      return updatedLocation;
    },

    async deleteLocationByID(id: string): Promise<void> {
      validateUUID(id);

      const fetchedLocation = await locationDAO.getLocationByID(id, true);
      if (!fetchedLocation) {
        throw new NotFoundError('Could not find location to delete');
      }

      if (fetchedLocation.deleted) {
        throw new ValidationError('Location already deleted');
      }

      await locationDAO.deleteLocationByID(id);
    },
  };
}



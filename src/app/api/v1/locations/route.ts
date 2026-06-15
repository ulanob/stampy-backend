import { locationDAO } from "@/src/composition";
import { CreateLocationInput } from "@/src/models/location.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";


export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (businessId) validateUUID(businessId.trim());

    const locations = businessId
      ? await locationDAO.getLocationsByBusinessID(businessId)
      : await locationDAO.getAllLocations();

    return NextResponse.json(locations, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/locations/")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateLocationInput = await request.json();

    const requiredFields: (keyof CreateLocationInput)[] = [
      "business_id",
      "address",
      "lat",
      "lng",
      "geofence_radius"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const createdLocation = await locationDAO.createLocation(body);

    if (!createdLocation) {
      return NextResponse.json(
        { error: "Failed to create location" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdLocation, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/locations/ ")
  }

}
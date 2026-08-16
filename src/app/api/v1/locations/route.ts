import { CreateLocationInput } from "@/src/models/location.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { locationService } from "@/src/composition";


export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (businessId) validateUUID(businessId);

    const locations = businessId
      ? await locationService.getLocationsByBusinessID(businessId)
      : await locationService.getAllLocations();

    return NextResponse.json(locations, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/locations/")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateLocationInput = await request.json();

    const createdLocation = await locationService.createLocation(body);

    return NextResponse.json(createdLocation, { status: 201 })

  } catch (error) {
    console.log(error);
    return handleRouteError(error, "POST /api/v1/locations/")
  }

}
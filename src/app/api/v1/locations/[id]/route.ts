import { locationDAO } from "@/src/composition";
import { UpdateLocationInput } from "@/src/models/location.model";
import { NextResponse } from "next/server";
import { validateUUID } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const location = await locationDAO.getLocationByID(id);

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(location, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/locations/[id] error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: Partial<UpdateLocationInput> = await request.json();

    const updatedLocation = await locationDAO.updateLocationByID(id, updates);

    if (!updatedLocation) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json(updatedLocation, { status: 200 });
  }
  catch (error) {
    console.error("PATCH /api/v1/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const location = await locationDAO.getLocationByID(id);
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.deleted) {
      return NextResponse.json({ error: 'Location already deleted' }, { status: 400 });
    }

    await locationDAO.deleteLocationByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error("DELETE /api/v1/locations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
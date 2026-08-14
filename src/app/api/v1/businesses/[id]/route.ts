import { businessService } from "@/src/composition";
import { UpdateBusinessInput } from "@/src/models/business.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const business = await businessService.getBusinessByID(id);

    return NextResponse.json(business, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/businesses/[id]")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string}> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim())

    const updates: Partial<UpdateBusinessInput> = await request.json();

    const updatedBusiness = await businessService.updateBusinessByID(id, updates);

    return NextResponse.json(updatedBusiness, { status: 200 });
  }
  catch (error) {
      return handleRouteError(error, "PATCH /api/v1/businesses/[id]");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());


    await businessService.deleteBusinessByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/businesses/[id]");

  }
}
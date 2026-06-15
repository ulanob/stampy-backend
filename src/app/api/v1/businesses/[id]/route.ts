import { businessDAO } from "@/src/composition";
import { UpdateBusinessInput } from "@/src/models/business.model";
import { NextResponse } from "next/server";
import { validateBusinessType, validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const business = await businessDAO.getBusinessByID(id);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

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
    validateUUID(id.trim());

    const updates: Partial<UpdateBusinessInput> = await request.json();

    if (updates.type) {
      validateBusinessType(updates.type);
    } 

    const updatedBusiness = await businessDAO.updateBusinessByID(id, updates);

    if (!updatedBusiness) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

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

    const business = await businessDAO.getBusinessByID(id, true);

    if (business && business.deleted) {
      return NextResponse.json({ error: 'Business already deleted' }, { status: 400 });
    } else if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }


    await businessDAO.deleteBusinessByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/businesses/[id]");

  }
}
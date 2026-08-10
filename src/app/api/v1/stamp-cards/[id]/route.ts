import { stampCardService } from "@/src/composition";
import { UpdateStampCardInput } from "@/src/models/stamp-card.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const stampCard = await stampCardService.getStampCardByID(id);

    return NextResponse.json(stampCard, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/stamp-cards/[id]")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: Partial<UpdateStampCardInput> = await request.json();

    const updatedCard = await stampCardService.updateStampCardByID(id, updates);

    return NextResponse.json(updatedCard, { status: 200 });
  }
  catch (error) {
    return handleRouteError(error, "PATCH /api/v1/stamp-cards/[id]")
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    await stampCardService.deleteStampCardByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/stamp-cards/[id]")
  }
}



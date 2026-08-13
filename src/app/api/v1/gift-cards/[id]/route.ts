import { giftCardService } from "@/src/composition";
import { UpdateGiftCardInput } from "@/src/models/gift-card.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const giftCard = await giftCardService.getGiftCardByID(id);

    return NextResponse.json(giftCard, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/gift-cards/[id]")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: UpdateGiftCardInput = await request.json();

    const updatedCard = await giftCardService.updateGiftCardByID(id, updates);

    return NextResponse.json(updatedCard, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/v1/gift-cards/[id]")
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    await giftCardService.deleteGiftCardByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/gift-cards/[id]")
  }
}



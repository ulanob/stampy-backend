import { giftCardDAO } from "@/src/composition";
import { UpdateGiftCardInput } from "@/src/models/gift-card.model";
import { NextResponse } from "next/server";
import { validateUUID } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const giftCard = await giftCardDAO.getGiftCardByID(id);

    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(giftCard, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/gift-cards/[id] error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const updatedCard = await giftCardDAO.updateGiftCardByID(id, updates);

    if (!updatedCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
    }

    return NextResponse.json(updatedCard, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/v1/gift-cards/[id] error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const card = await giftCardDAO.getGiftCardByID(id);
    if (!card) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    if (card.deleted) {
      return NextResponse.json({ error: 'Gift card already deleted' }, { status: 400 });
    }

    await giftCardDAO.deleteGiftCardByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error("DELETE /api/v1/gift-cards/[id] error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



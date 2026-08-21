import { giftCardEventService } from "@/src/composition";
import { CreateGiftCardEventInput } from "@/src/models/gift-card-event.model";
import { handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("request_id");

    if (requestId) {
      const event = await giftCardEventService.getGiftCardEventByRequestID(requestId);
      if (!event) {
        return NextResponse.json({ error: "Gift card event not found" }, { status: 404 });
      }
      return NextResponse.json(event, { status: 200 });
    }

    const giftCardEvents = await giftCardEventService.getGiftCardEventsByGiftCardID(id);
    return NextResponse.json(giftCardEvents, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/v1/gift-cards/[id]/gift-card-events");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gift_card_id } = await params;

    const body: CreateGiftCardEventInput = await request.json();

    const createdGiftCardEvent = await giftCardEventService.createGiftCardEvent({
      ...body,
      gift_card_id
    });

    return NextResponse.json(createdGiftCardEvent, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/v1/gift-cards/[id]/gift-card-events");
  }
}
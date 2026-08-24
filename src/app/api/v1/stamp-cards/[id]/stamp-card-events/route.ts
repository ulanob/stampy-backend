import { stampCardEventService } from "@/src/composition";
import { CreateStampCardEventInput } from "@/src/models/stamp-card-event.model";
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
      const event = await stampCardEventService.getStampCardEventByRequestID(requestId);
      if (!event) {
        return NextResponse.json({ error: "Stamp card event not found" }, { status: 404 });
      }
      return NextResponse.json(event, { status: 200 });
    }

    const stampCardEvents = await stampCardEventService.getStampCardEventsByStampCardID(id);
    return NextResponse.json(stampCardEvents, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/v1/stamp-cards/[id]/stamp-events");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stamp_card_id } = await params;

    const body: CreateStampCardEventInput = await request.json();

    const createdStampCardEvent = await stampCardEventService.createStampCardEvent({
      ...body,
      stamp_card_id,
      quantity: body.quantity ?? 1,
    });

    return NextResponse.json(createdStampCardEvent, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/v1/stamp-cards/[id]/stamp-events");
  }
}
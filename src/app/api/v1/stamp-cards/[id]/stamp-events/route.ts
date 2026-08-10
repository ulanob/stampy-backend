import { stampEventService } from "@/src/composition";
import { CreateStampEventInput } from "@/src/models/stamp-event.model";
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
      const event = await stampEventService.getStampEventByRequestID(requestId);
      if (!event) {
        return NextResponse.json({ error: "Stamp event not found" }, { status: 404 });
      }
      return NextResponse.json(event, { status: 200 });
    }

    const stampEvents = await stampEventService.getStampEventsByStampCardID(id);
    return NextResponse.json(stampEvents, { status: 200 });
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

    const body: CreateStampEventInput = await request.json();

    const createdStampEvent = await stampEventService.createStampEvent({
      ...body,
      stamp_card_id,
      quantity: body.quantity ?? 1,
    });

    return NextResponse.json(createdStampEvent, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/v1/stamp-cards/[id]/stamp-events");
  }
}
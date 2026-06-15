import { stampEventDAO } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const stampEvents = await stampEventDAO.getStampEventsByCard(id);

    return NextResponse.json(stampEvents, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/stamp-cards/[id]/stamp-events")
  }
}
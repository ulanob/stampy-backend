import { stampEventDAO } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const stampEvents = await stampEventDAO.getAllStampEventsByUserID(userId);

    return NextResponse.json(stampEvents, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]/stamp-events")
  }
}
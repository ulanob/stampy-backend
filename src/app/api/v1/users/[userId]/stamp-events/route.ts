import { stampCardEventService } from "@/src/composition";
import { handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const userStampCardEvents = await stampCardEventService.getAllStampCardEventsByUserID(userId)

    return NextResponse.json(userStampCardEvents, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]/stamp-events")
  }
}
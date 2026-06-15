import { notificationDAO } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const notifications = await notificationDAO.getAllNotificationsByUserID(userId);

    return NextResponse.json(notifications, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[id]/notifications")
  }
}
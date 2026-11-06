import { notificationService } from "@/src/composition";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const notification = await notificationService.getNotificationByID(id);

    return NextResponse.json(notification, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/notifications/[id]")
  }
}

import { notificationService } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const notification = await notificationService.markNotificationAsRead(id);

    return NextResponse.json(notification, { status: 200 });
  }
  catch (error) {
    return handleRouteError(error, "POST /api/v1/notifications/[id]/read")
  }

}
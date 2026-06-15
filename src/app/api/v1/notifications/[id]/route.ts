import { notificationDAO } from "@/src/composition";
import { UpdateNotificationInput } from "@/src/models/notification.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const notification = await notificationDAO.getNotificationByID(id);

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(notification, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/notifications/[id] ")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: Partial<UpdateNotificationInput> = await request.json();

    const updatedNotification = await notificationDAO.updateNotificationByID(id, updates);

    if (!updatedNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json(updatedNotification, { status: 200 });
  }
  catch (error) {
    return handleRouteError(error, "PATCH /api/v1/notifications/[id]")
  }

}

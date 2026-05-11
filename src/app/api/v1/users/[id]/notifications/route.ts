import { notificationDAO } from "@/src/composition";
import { validateUUID } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const notifications = await notificationDAO.getAllNotificationsByUserID(id);

    return NextResponse.json(notifications, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/users/[id]/notifications error:", error);
    return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
    );
  }
}
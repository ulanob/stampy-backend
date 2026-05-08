import { userNotificationPreferencesDAO } from "@/src/composition";
import { UpdateUserNotificationPreferences } from "@/src/models/user-notification-preferences.model";
import { NextResponse } from "next/server";
import { validateUUID } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const userNotificationPreferences = await userNotificationPreferencesDAO.getUserNotificationPreferencesByUserID(id);

    if (!userNotificationPreferences) {
      return NextResponse.json(
        { error: 'UserNotificationPreferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userNotificationPreferences, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/users/[id]/preferences error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: UpdateUserNotificationPreferences = await request.json();

    const updatedUserNotificationPreferences = await userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID(id, updates);

    if (!updatedUserNotificationPreferences) {
      return NextResponse.json({ error: "UserNotificationPreferences not found" }, { status: 404 })
    }

    return NextResponse.json(updatedUserNotificationPreferences, { status: 200 });
  }
  catch (error) {
    console.error("PATCH /api/v1/users/[id]/preferences error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

}

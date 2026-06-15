import { userNotificationPreferencesDAO } from "@/src/composition";
import { UpdateUserNotificationPreferences } from "@/src/models/user-notification-preferences.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const userNotificationPreferences = await userNotificationPreferencesDAO.getUserNotificationPreferencesByUserID(userId);

    if (!userNotificationPreferences) {
      return NextResponse.json(
        { error: 'UserNotificationPreferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userNotificationPreferences, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]/preferences")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const updates: UpdateUserNotificationPreferences = await request.json();

    const updatedUserNotificationPreferences = await userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID(userId, updates);

    if (!updatedUserNotificationPreferences) {
      return NextResponse.json({ error: "UserNotificationPreferences not found" }, { status: 404 })
    }

    return NextResponse.json(updatedUserNotificationPreferences, { status: 200 });
  }
  catch (error) {
    return handleRouteError(error, "PATCH /api/v1/users/[userId]/preferences")
  }

}

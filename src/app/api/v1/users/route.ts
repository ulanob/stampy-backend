import { userDAO, userNotificationPreferencesDAO } from "@/src/composition";
import { CreateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request
) {
  try {
    const users = await userDAO.getAllUsers();

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/users error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateUserInput = await request.json();

    // TODO: set from Cognito
    const requiredFields: (keyof CreateUserInput)[] = [
      "email"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const createdUser = await userDAO.createUser(body);

    if (!createdUser) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // create user notification preferences
    await userNotificationPreferencesDAO.createUserNotificationPreferences({
      user_id: createdUser.id,
      notifications_enabled: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
      general_notification_window_start: null,
      general_notification_window_end: null,
      notify_window_days: null, 
      daily_notification_cap: 5
    })

    return NextResponse.json(createdUser, { status: 201 })

  } catch (error) {
    console.error("POST /api/v1/users error:", error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

}
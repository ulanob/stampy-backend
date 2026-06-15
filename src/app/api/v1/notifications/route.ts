import { notificationDAO } from "@/src/composition";
import { CreateNotificationInput } from "@/src/models/notification.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";


export async function POST(request: Request) {
  try {
    const body: CreateNotificationInput = await request.json();

    const requiredFields: (keyof CreateNotificationInput)[] = [
      "user_id",
      "type",
      "subject",
      "body"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }


    const createdNotification = await notificationDAO.createNotification(body);

    if (!createdNotification) {
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdNotification, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/notifications")
  }
}


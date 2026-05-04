import { userDAO } from "@/src/composition";
import { CreateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request
) {
  try {
    const users = await userDAO.getAllUsers();

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/users/ error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    return NextResponse.json(createdUser, { status: 201 })

  } catch (error: any) {
    console.error("POST /api/v1/users error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }

}
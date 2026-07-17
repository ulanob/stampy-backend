import { userService } from "@/src/composition";
import { CreateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request
) {
  try {
    const users = await userService.getAllUsers();

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateUserInput = await request.json();

    const createdUser = await userService.createUser(body);

    return NextResponse.json(createdUser, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/users")
  }
}
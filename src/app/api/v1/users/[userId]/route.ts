import { userService } from "@/src/composition";
import { UpdateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await userService.getUserByID(userId);

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const updates: Partial<UpdateUserInput> = await request.json();

    const updatedUser = await userService.updateUserByID(userId, updates);

    return NextResponse.json(updatedUser, { status: 200 });
  }
  catch (error) {
    return handleRouteError(error, "PATCH /api/v1/users/[userId]")
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    await userService.deleteUserByID(userId);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/users/[userId]")
  }
}
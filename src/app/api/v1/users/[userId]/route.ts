import { userDAO } from "@/src/composition";
import { UpdateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";
import { validateUUID, handleRouteError } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const user = await userDAO.getUserByID(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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
    validateUUID(userId.trim());

    const updates: Partial<UpdateUserInput> = await request.json();

    const updatedUser = await userDAO.updateUserByID(userId, updates);

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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
    validateUUID(userId.trim());

    const user = await userDAO.getUserByID(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.deleted) {
      return NextResponse.json({ error: 'User already deleted' }, { status: 400 });
    }

    await userDAO.deleteUserByID(userId);

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    return handleRouteError(error, "DELETE /api/v1/users/[userId]")
  }
}
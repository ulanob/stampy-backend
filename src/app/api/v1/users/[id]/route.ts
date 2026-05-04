import { userDAO } from "@/src/composition";
import { UpdateUserInput } from "@/src/models/user.model";
import { NextResponse } from "next/server";
import { validateUUID } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const user = await userDAO.getUserByID(id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/users/[id] error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: Partial<UpdateUserInput> = await request.json();

    const updatedUser = await userDAO.updateUserByID(id, updates);

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(updatedUser, { status: 200 });
  }
  catch (error: any) {
    console.error("PATCH /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const user = await userDAO.getUserByID(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.deleted) {
      return NextResponse.json({ error: 'User already deleted' }, { status: 400 });
    }

    await userDAO.deleteUserByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error: any) {
    console.error("DELETE /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
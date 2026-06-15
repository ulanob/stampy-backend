import { stampCardDAO } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    validateUUID(userId.trim());

    const stampCards = await stampCardDAO.getAllStampCardsByUserID(userId);

    return NextResponse.json(stampCards, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]/stamp-cards")
  }
}
import { stampCardDAO } from "@/src/composition";
import { validateUUID, handleRouteError } from "@/src/utils/validators";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    validateUUID(cardId.trim());

    const stampEvents = await stampCardDAO.getStampCardByID(cardId);

    return NextResponse.json(stampEvents, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/users/[userId]/stamp-cards/[cardId]")
  }
}
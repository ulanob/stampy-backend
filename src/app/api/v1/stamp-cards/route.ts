import { stampCardService } from "@/src/composition";
import { CreateStampCardInput } from "@/src/models/stamp-card.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";


export async function POST(request: Request) {
  try {
    const body: CreateStampCardInput = await request.json();

    const createdCard = await stampCardService.createStampCard(body);

    return NextResponse.json(createdCard, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/stamp-cards/")
  }
}


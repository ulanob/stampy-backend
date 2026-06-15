import { stampCardDAO } from "@/src/composition";
import { CreateStampCardInput } from "@/src/models/stamp-card.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";


export async function GET(
  _request: Request
) {
  try {
    const stampCards = await stampCardDAO.getAllCards();

    return NextResponse.json(stampCards ?? [], { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/stamp-cards/")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateStampCardInput = await request.json();

    const requiredFields: (keyof CreateStampCardInput)[] = [
      "business_id",
      "stamps_needed"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const createdCard = await stampCardDAO.createStampCard(body);

    if (!createdCard) {
      return NextResponse.json(
        { error: "Failed to create stamp card" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdCard, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/stamp-cards/")
  }
}


import { giftCardService } from "@/src/composition";
import { CreateGiftCardInput } from "@/src/models/gift-card.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";

export async function POST(request: Request) {
  try {
    const body: CreateGiftCardInput = await request.json();

    const createdCard = await giftCardService.createGiftCard(body);

    return NextResponse.json(createdCard, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/gift-cards")
  }

}


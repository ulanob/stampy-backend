import { giftCardDAO } from "@/src/composition";
import { CreateGiftCardInput } from "@/src/models/gift-card.model";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/src/utils/validators";


export async function GET(
  _request: Request
) {
  try {
    const giftCards = await giftCardDAO.getAllGiftCards();

    return NextResponse.json(giftCards, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/gift-cards/")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateGiftCardInput = await request.json();

    const requiredFields: (keyof CreateGiftCardInput)[] = [
      "user_id",
      "business_id",
      "initial_balance",
      "currency"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const createdCard = await giftCardDAO.createGiftCard({
      ... body, 
      current_balance: body.current_balance ?? body.initial_balance,
    });

    if (!createdCard) {
      return NextResponse.json(
        { error: "Failed to create gift card" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdCard, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/gift-cards")
  }

}


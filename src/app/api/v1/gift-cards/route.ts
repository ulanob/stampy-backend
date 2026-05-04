import { giftCardDAO } from "@/src/composition";
import { CreateGiftCardInput } from "@/src/models/gift-card.model";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request
) {
  try {
    const giftCards = await giftCardDAO.getAllGiftCards();

    return NextResponse.json(giftCards, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/gift-cards/ error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateGiftCardInput = await request.json();

    const requiredFields: (keyof CreateGiftCardInput)[] = [
      "user_id",
      "business_id",
      "current_balance",
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

    const createdCard = await giftCardDAO.createGiftCard(body);

    if (!createdCard) {
      return NextResponse.json(
        { error: "Failed to create gift card" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdCard, { status: 201 })

  } catch (error: any) {
    console.error("POST /api/v1/gift-cards error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }

}


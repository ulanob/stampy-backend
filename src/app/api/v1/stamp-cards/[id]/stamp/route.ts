  import { stampEventDAO } from "@/src/composition";
  import { CreateStampEventInput } from "@/src/models/stamp-event.model";
  import { NextResponse } from "next/server";
  import { validateUUID, handleRouteError } from "@/src/utils/validators";

  export async function POST(request: Request, 
    { params }: { params: Promise<{ id: string }>}
  ) {
    try {
      const { id: stamp_card_id } = await params;
      validateUUID(stamp_card_id);
    
      const body: CreateStampEventInput = await request.json();

      const requiredFields: (keyof CreateStampEventInput)[] = [
        "user_id"
      ];

      for (const field of requiredFields) {
        if (body[field] === undefined || body[field] === null) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 }
          );
        }
      }

      const createdStamp = await stampEventDAO.createStampEvent({
        ...body,
        stamp_card_id,
        quantity: body.quantity ?? 1
      });

      if (!createdStamp) {
        return NextResponse.json(
          { error: "Failed to stamp" },
          { status: 500 }
        )
      }

      return NextResponse.json(createdStamp, { status: 201 })

    } catch (error) {
      return handleRouteError(error, "POST /api/v1/stamp-cards/[id]/stamp")
    }

  }


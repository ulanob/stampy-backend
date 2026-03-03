import { businessDAO } from "@/src/composition";
import { CreateBusinessInput, validTypes } from "@/src/models/business.model";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request
) {
  try {
    const businesses = await businessDAO.getAllBusinesses();

    return NextResponse.json(businesses, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/businesses/ error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateBusinessInput = await request.json();

    const requiredFields: (keyof CreateBusinessInput)[] = [
      "name",
      "type"
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }


    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid business type: ${body.type}` },
        { status: 400 }
      );
    }

    const createdBusiness = await businessDAO.createBusiness(body);

    if (!createdBusiness) {
      return NextResponse.json(
        { error: "Failed to create business" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdBusiness, { status: 201 })

  } catch (error: any) {
    console.error("POST /api/v1/businesses error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }

}


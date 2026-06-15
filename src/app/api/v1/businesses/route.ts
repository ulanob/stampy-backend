import { businessDAO } from "@/src/composition";
import { CreateBusinessInput } from "@/src/models/business.model";
import { validateBusinessType, handleRouteError} from "@/src/utils/validators";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request
) {
  try {
    const businesses = await businessDAO.getAllBusinesses();

    return NextResponse.json(businesses, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/businesses/")
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


    validateBusinessType(body.type)

    const createdBusiness = await businessDAO.createBusiness(body);

    if (!createdBusiness) {
      return NextResponse.json(
        { error: "Failed to create business" },
        { status: 500 }
      )
    }

    return NextResponse.json(createdBusiness, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/businesses/")
  }

}


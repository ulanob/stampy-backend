import { businessService } from "@/src/composition";
import { CreateBusinessInput } from "@/src/models/business.model";
import { handleRouteError} from "@/src/utils/validators";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request
) {
  try {
    const businesses = await businessService.getAllBusinesses();

    return NextResponse.json(businesses, { status: 200 });

  } catch (error) {
    return handleRouteError(error, "GET /api/v1/businesses/")
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateBusinessInput = await request.json();

    const createdBusiness = await businessService.createBusiness(body);

    return NextResponse.json(createdBusiness, { status: 201 })

  } catch (error) {
    return handleRouteError(error, "POST /api/v1/businesses/")
  }

}


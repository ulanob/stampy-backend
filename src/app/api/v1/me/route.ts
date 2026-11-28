import { requireAuth } from '@/src/composition';
import { toUserResponse } from '@/src/models/user.model';
import { handleRouteError } from '@/src/utils/validators';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return NextResponse.json(toUserResponse(user), { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'GET /api/v1/me');
  }
}

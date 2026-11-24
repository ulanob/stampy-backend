import { checkInService } from '@/src/composition';
import { handleRouteError, validateUUID } from '@/src/utils/validators';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const location_id = id.trim();
    validateUUID(location_id);

    const body = await request.json();

    await checkInService.checkIn(location_id, body?.user_id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, 'POST /api/v1/locations/[id]/check-in');
  }
}

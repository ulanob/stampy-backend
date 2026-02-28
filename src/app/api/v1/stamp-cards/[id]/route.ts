import { stampCardDAO } from "@/src/composition";
import { UpdateStampCardInput } from "@/src/models/stamp-card.model";
import { NextResponse } from "next/server";
import { validateUUID } from "@/src/utils/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const stampCard = await stampCardDAO.getByID(id);

    if (!stampCard) {
      return NextResponse.json(
        { error: 'Stamp card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stampCard, { status: 200 });

  } catch (error) {
    console.error("GET /api/v1/stamp-cards/[id] error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const updates: Partial<UpdateStampCardInput> = await request.json();

    const updatedCard = await stampCardDAO.updateByID(id, updates);

    if (!updatedCard) {
      return NextResponse.json({ error: "Cannot find stamp card/ no fields to update" }, { status: 404 })
    }

    return NextResponse.json(updatedCard, { status: 200 });
  }
  catch (error: any) {
    console.error("PATCH /api/v1/stamp-cards/[id] error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }

}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    validateUUID(id.trim());

    const card = await stampCardDAO.getByID(id);
    if (!card) {
      return NextResponse.json({ error: 'Stamp card not found' }, { status: 404 });
    }

    if (card.deleted) {
      return NextResponse.json({ error: 'Stamp card already deleted' }, { status: 400 });
    }

    await stampCardDAO.deleteByID(id);

    return new NextResponse(null, { status: 204 })

  } catch (error: any) {
    console.error("DELETE /api/v1/stamp-cards/[id] error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}



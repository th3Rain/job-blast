import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

// PATCH /api/applications/:id -> update status / notes / follow-up (tracker edits).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.application.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") {
    if (!APPLICATION_STATUSES.includes(body.status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.notes === "string") data.notes = body.notes;
  if (body.followUpDate === null || typeof body.followUpDate === "string") {
    data.followUpDate = body.followUpDate ? new Date(body.followUpDate) : null;
  }

  const updated = await prisma.application.update({ where: { id }, data });
  return NextResponse.json({ application: updated });
}

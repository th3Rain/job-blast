import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, parseProfile } from "@/lib/user";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(parseProfile(user));
}

// Update editable profile fields. Arrays/objects are stored as JSON strings.
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.masterResume === "string") data.masterResume = body.masterResume;
  if (Array.isArray(body.coverTemplates))
    data.coverTemplates = JSON.stringify(body.coverTemplates);
  if (Array.isArray(body.targetRoles))
    data.targetRoles = JSON.stringify(body.targetRoles);
  if (Array.isArray(body.targetLocations))
    data.targetLocations = JSON.stringify(body.targetLocations);
  if (Array.isArray(body.excludedCompanies))
    data.excludedCompanies = JSON.stringify(body.excludedCompanies);
  if (body.salaryFloor === null || typeof body.salaryFloor === "number")
    data.salaryFloor = body.salaryFloor;
  if (typeof body.dailyGoal === "number") data.dailyGoal = body.dailyGoal;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });
  return NextResponse.json(parseProfile(updated));
}

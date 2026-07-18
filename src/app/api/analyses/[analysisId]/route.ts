import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ analysisId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { analysisId } = await params;
  const analysis = await prisma.analysis.findFirst({ where: { id: analysisId, userId: session.user.id }, include: { steps: { orderBy: { order: "asc" } } } });
  if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  return NextResponse.json({ analysis });
}

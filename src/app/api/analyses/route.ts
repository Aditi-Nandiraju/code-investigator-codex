import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { runAnalysis } from "@/lib/analysis/engine";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.repoOwner !== "string" || typeof body.repoName !== "string" || typeof body.issueTitle !== "string" || typeof body.issueBody !== "string" || typeof body.issueNumber !== "number" || !Number.isInteger(body.issueNumber) || body.issueNumber < 1) {
    return NextResponse.json({ error: "Repository and issue details are required." }, { status: 400 });
  }
  try {
    const analysis = await runAnalysis(session.user.id, { repoOwner: body.repoOwner, repoName: body.repoName, issueNumber: body.issueNumber, issueTitle: body.issueTitle, issueBody: body.issueBody });
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed." }, { status: 502 });
  }
}

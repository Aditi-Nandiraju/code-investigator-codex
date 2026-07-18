import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { fetchOpenIssues } from "@/lib/github/issues";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const owner = params.get("owner");
  const repo = params.get("repo");
  const numberParam = params.get("number");
  const issueNumber = numberParam ? Number(numberParam) : undefined;

  if (!owner || !repo || (numberParam && (issueNumber === undefined || !Number.isInteger(issueNumber) || issueNumber < 1))) {
    return NextResponse.json({ error: "A valid repository is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ issues: await fetchOpenIssues(session.user.id, owner, repo, issueNumber) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load issues.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

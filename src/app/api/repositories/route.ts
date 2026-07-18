import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { fetchUserRepositories } from "@/lib/github/repositories";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const repositories = await fetchUserRepositories(session.user.id);
    return NextResponse.json({ repositories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load repositories.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

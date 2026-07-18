import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}

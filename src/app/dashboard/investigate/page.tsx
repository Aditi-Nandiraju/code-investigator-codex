import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { InvestigationPage } from "@/components/investigation/investigation-page";

export default async function InvestigatePage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <InvestigationPage />;
}

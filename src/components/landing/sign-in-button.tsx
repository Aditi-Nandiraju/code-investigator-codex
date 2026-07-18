import { GitBranch } from "lucide-react";

import { signInWithGitHub } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <form action={signInWithGitHub}>
      <Button type="submit" size="lg" className="h-11 bg-cyan-300 px-5 font-semibold text-slate-950 hover:bg-cyan-200">
        <GitBranch data-icon="inline-start" />
        Sign in with GitHub
      </Button>
    </form>
  );
}

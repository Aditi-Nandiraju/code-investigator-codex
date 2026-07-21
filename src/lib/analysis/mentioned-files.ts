import type { RepositoryTreeEntry } from "@/lib/github/repository-context";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds repository files explicitly named in issue text (title + body), so the backend —
 * not the model — decides which files are relevant whenever the issue already says so.
 * Matches full paths and bare basenames, exactly (case-sensitive) and only against files
 * that actually exist in the repository — this can never produce a hallucinated filename.
 */
export function extractMentionedFiles(issueBody: string, repositoryFiles: RepositoryTreeEntry[]): RepositoryTreeEntry[] {
  const matches: RepositoryTreeEntry[] = [];
  const seenPaths = new Set<string>();

  for (const file of repositoryFiles) {
    const basename = file.path.split("/").pop() ?? file.path;
    const candidates = basename === file.path ? [file.path] : [file.path, basename];

    const isMentioned = candidates.some((candidate) => {
      const escaped = escapeRegExp(candidate);
      // Matches the filename either wrapped in backticks (`file.ext`) or as a standalone
      // token in prose — never as a mid-word substring of something else (so "style.css"
      // doesn't match inside "not-style.css.bak" or similar).
      const pattern = new RegExp(`\`${escaped}\`|(?<![\\w./-])${escaped}(?![\\w./-])`);
      return pattern.test(issueBody);
    });

    if (isMentioned && !seenPaths.has(file.path)) {
      seenPaths.add(file.path);
      matches.push(file);
    }
  }

  return matches;
}

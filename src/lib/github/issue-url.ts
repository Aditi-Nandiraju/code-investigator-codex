export type ParsedIssueUrl = { owner: string; repo: string; number: number };

const issueUrlPattern = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/i;

export function parseIssueUrl(value: string): ParsedIssueUrl | null {
  const match = value.trim().match(issueUrlPattern);
  return match ? { owner: match[1], repo: match[2], number: Number(match[3]) } : null;
}

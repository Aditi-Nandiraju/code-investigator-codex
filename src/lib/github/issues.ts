import { getGitHubAccessToken } from "@/lib/github/repositories";

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  body: string | null;
  author: string;
  authorAvatarUrl: string | null;
  labels: string[];
  createdAt: string;
  state: "open" | "closed";
};

type GitHubIssueResponse = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name?: string | null }>;
  created_at: string;
  state: "open" | "closed";
  pull_request?: unknown;
};

function mapIssue(issue: GitHubIssueResponse): GitHubIssue {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    htmlUrl: issue.html_url,
    body: issue.body,
    author: issue.user?.login ?? "unknown",
    authorAvatarUrl: issue.user?.avatar_url ?? null,
    labels: issue.labels.map((label) => label.name).filter((name): name is string => Boolean(name)),
    createdAt: issue.created_at,
    state: issue.state,
  };
}

function repositoryPath(owner: string, repo: string) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    throw new Error("Invalid repository.");
  }
  return `${owner}/${repo}`;
}

export async function fetchOpenIssues(userId: string, owner: string, repo: string, issueNumber?: number) {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) throw new Error("GitHub access is not available. Please sign in again.");

  const path = repositoryPath(owner, repo);
  const endpoint = issueNumber
    ? `https://api.github.com/repos/${path}/issues/${issueNumber}`
    : `https://api.github.com/repos/${path}/issues?state=open&sort=created&direction=desc&per_page=100`;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("GitHub authorization expired. Please sign in again.");
    if (response.status === 404) throw new Error("That issue could not be found in this repository.");
    throw new Error("GitHub could not load issues right now.");
  }

  const payload = await response.json();
  const rawIssues = Array.isArray(payload) ? payload : [payload];
  return rawIssues.filter((issue: GitHubIssueResponse) => !issue.pull_request).map(mapIssue);
}

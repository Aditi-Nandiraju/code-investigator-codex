import { prisma } from "@/lib/db/prisma";

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  isPrivate: boolean;
  updatedAt: string;
};

type GitHubRepositoryResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
  updated_at: string;
};

export async function getGitHubAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });

  return account?.access_token ?? null;
}

export async function fetchUserRepositories(userId: string) {
  const accessToken = await getGitHubAccessToken(userId);

  if (!accessToken) {
    throw new Error("GitHub access is not available. Please sign in again.");
  }

  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&direction=desc&per_page=100&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GitHub authorization expired. Please sign in again.");
    }
    throw new Error("GitHub could not load your repositories right now.");
  }

  const repositories = (await response.json()) as GitHubRepositoryResponse[];

  return repositories.map((repository): GitHubRepository => ({
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description,
    htmlUrl: repository.html_url,
    language: repository.language,
    stars: repository.stargazers_count,
    isPrivate: repository.private,
    updatedAt: repository.updated_at,
  }));
}

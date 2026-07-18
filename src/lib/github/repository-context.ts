import { getGitHubAccessToken } from "@/lib/github/repositories";

export type RepositoryTreeEntry = {
  path: string;
  sha: string;
  size: number | null;
  type: "blob" | "tree";
  url: string;
  content?: string;
};

export type RepositoryContext = {
  metadata: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    fetchedAt: string;
    truncated: boolean;
    fileCount: number;
  };
  tree: RepositoryTreeEntry[];
  files: RepositoryTreeEntry[];
};

type GitHubRepositoryResponse = { full_name: string; default_branch: string };
type GitHubTreeResponse = { tree?: Array<{ path: string; sha: string; size?: number; type: string; url: string }>; truncated?: boolean };

const ignoredDirectories = new Set(["node_modules", "dist", "build", "vendor", ".git", ".next", "coverage"]);
const binaryExtensions = /\.(?:7z|avi|bmp|class|dll|dmg|eot|exe|gif|ico|jar|jpeg|jpg|mov|mp3|mp4|ogg|otf|pdf|png|so|tar|ttf|wav|webm|webp|woff2?|zip)$/i;
const generatedFilePattern = /(?:^|[._-])(generated|gen|min|bundle)(?:[._-]|$)|(?:^|\/)(?:generated|__generated__)(?:\/|$)/i;

function validSegment(value: string) {
  return /^[a-zA-Z0-9_.-]+$/.test(value);
}

function shouldIgnore(path: string) {
  const segments = path.split("/");
  return segments.some((segment) => ignoredDirectories.has(segment)) || binaryExtensions.test(path) || generatedFilePattern.test(path);
}

export async function buildRepositoryContext(userId: string, owner: string, name: string): Promise<RepositoryContext> {
  if (!validSegment(owner) || !validSegment(name)) throw new Error("Invalid repository.");
  const token = await getGitHubAccessToken(userId);
  if (!token) throw new Error("GitHub access is not available. Please sign in again.");
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
  const base = `https://api.github.com/repos/${owner}/${name}`;
  const repositoryResponse = await fetch(base, { headers, cache: "no-store" });
  if (!repositoryResponse.ok) throw new Error("GitHub could not load repository metadata.");
  const repository = (await repositoryResponse.json()) as GitHubRepositoryResponse;
  const treeResponse = await fetch(`${base}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`, { headers, cache: "no-store" });
  if (!treeResponse.ok) throw new Error("GitHub could not load the repository tree.");
  const payload = (await treeResponse.json()) as GitHubTreeResponse;
  const tree = (payload.tree ?? []).filter((entry) => entry.type === "tree" || entry.type === "blob").map((entry): RepositoryTreeEntry => ({
    path: entry.path, sha: entry.sha, size: entry.size ?? null, type: entry.type as "blob" | "tree", url: entry.url,
  }));
  const files = tree.filter((entry) => entry.type === "blob" && !shouldIgnore(entry.path)).slice(0, 80);
  const filesWithContent = await Promise.all(files.map(async (file) => {
    try {
      const response = await fetch(file.url, { headers, cache: "no-store" });
      if (!response.ok) return file;
      const blob = (await response.json()) as { encoding?: string; content?: string; size?: number };
      if (blob.encoding !== "base64" || !blob.content || (blob.size ?? 0) > 50_000) return file;
      return { ...file, content: Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, 50_000) };
    } catch { return file; }
  }));
  return {
    metadata: { owner, name, fullName: repository.full_name, defaultBranch: repository.default_branch, fetchedAt: new Date().toISOString(), truncated: payload.truncated ?? false, fileCount: filesWithContent.length },
    tree, files: filesWithContent,
  };
}

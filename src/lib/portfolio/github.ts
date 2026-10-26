/**
 * FolioAtlas — GitHub identity derivation from a portfolio URL.
 *
 * Author attribution rules (PRD §3): a GitHub identity is derived ONLY from
 * a github.io subdomain (GitHub Pages usernames), and is always labeled as
 * an inference. Nothing is guessed from arbitrary URLs.
 */
export type GithubDerivation = {
  username: string | null;
  source: "none" | "inferred-domain";
};

export function deriveGithubUsername(portfolioUrl: string): GithubDerivation {
  try {
    const host = new URL(portfolioUrl).host.toLowerCase();
    if (host.endsWith(".github.io")) {
      const sub = host.slice(0, -".github.io".length);
      if (sub && sub !== "www" && sub !== "pages") {
        return { username: sub, source: "inferred-domain" };
      }
    }
  } catch {
    /* malformed URLs stay anonymous */
  }
  return { username: null, source: "none" };
}

/** Canonical avatar URL for a GitHub username (redirects to the avatar; 404s gracefully for unknown users). */
export function githubAvatarUrl(username: string, size = 240): string {
  return `https://github.com/${encodeURIComponent(username)}.png?size=${size}`;
}

export function githubProfileUrl(username: string): string {
  return `https://github.com/${encodeURIComponent(username)}`;
}

import type { Repo, PullRequest, Reviewer, ReviewStatus } from '@/types/github';
import { fetchWorkItemStates } from '@/services/ado';

const GITHUB_API = 'https://api.github.com';
const ORG = 'nelnet-nbs';
const REPO_PREFIX = 'daycare-';

type Review = {
  id: number;
  user: Reviewer;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
};

function getHeaders(): HeadersInit {
  const token = import.meta.env.VITE_GITHUB_TOKEN as string;
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDaycareRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${ORG}/repos?per_page=${perPage}&page=${page}&sort=name`,
      { headers: getHeaders() },
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data: Repo[] = await res.json();
    if (data.length === 0) break;

    repos.push(...data.filter((r) => r.name.startsWith(REPO_PREFIX)));
    if (data.length < perPage) break;
    page++;
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// REST — per-PR review fetch
// ---------------------------------------------------------------------------

async function fetchPRReviews(repoName: string, prNumber: number): Promise<Review[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${ORG}/${repoName}/pulls/${prNumber}/reviews`,
    { headers: getHeaders() },
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAdoIds(body: string | null): number[] {
  if (!body) return [];
  const matches = body.matchAll(/https:\/\/dev\.azure\.com\/[^\s)]+\/_workitems\/edit\/(\d+)/g);
  const ids = new Set<number>();
  for (const m of matches) {
    ids.add(Number(m[1]));
  }
  return [...ids];
}

function resolveReviewStatus(latestState: string): ReviewStatus {
  if (latestState === 'CHANGES_REQUESTED') return 'changes-requested';
  if (latestState === 'COMMENTED') return 'commented';
  return 'pending';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchOpenPullRequests(repoName: string): Promise<PullRequest[]> {
  const rawPrs: Omit<PullRequest, 'pendingReviewers' | 'adoWorkItems'>[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/repos/${ORG}/${repoName}/pulls?state=open&per_page=${perPage}&page=${page}`,
      { headers: getHeaders() },
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data: Omit<PullRequest, 'pendingReviewers'>[] = await res.json();
    if (data.length === 0) break;

    rawPrs.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  // Parse ADO work item IDs from all PRs and batch-fetch their states (non-blocking)
  const prAdoIds = rawPrs.map((pr) => parseAdoIds(pr.body));
  const allAdoIds = [...new Set(prAdoIds.flat())];
  let adoMap = new Map<number, { id: number; url: string; state: string }>();
  try {
    const adoItems = await fetchWorkItemStates(allAdoIds);
    adoMap = new Map(adoItems.map((wi) => [wi.id, wi]));
  } catch {
    // ADO fetch failed (PAT missing or invalid) — continue without statuses
  }

  const prs = await Promise.all(
    rawPrs.map(async (pr, i) => {
      const reviews = await fetchPRReviews(repoName, pr.number);

      // Get the latest review state per user
      const latestByUser = new Map<number, Review>();
      for (const review of reviews) {
        if (!review.user) continue;
        latestByUser.set(review.user.id, review);
      }

      // Only APPROVED removes a reviewer from the pending list
      const approvedUserIds = new Set(
        [...latestByUser.values()]
          .filter((r) => r.state === 'APPROVED')
          .map((r) => r.user.id),
      );

      // Reviewers who commented or requested changes but haven't approved.
      // GitHub removes them from requested_reviewers once they submit ANY review,
      // so we must re-add them from the reviews data.
      const activeReviews = [...latestByUser.values()]
        .filter((r) => (r.state === 'COMMENTED' || r.state === 'CHANGES_REQUESTED') && !approvedUserIds.has(r.user.id));

      // Start with requested_reviewers (people who haven't acted yet)
      const requestedMap = new Map(pr.requested_reviewers.map((r) => [r.id, r]));

      // Add commenters/change-requesters who are no longer in requested_reviewers
      for (const review of activeReviews) {
        if (!requestedMap.has(review.user.id)) {
          requestedMap.set(review.user.id, review.user);
        }
      }

      const pendingReviewers = [...requestedMap.values()]
        .filter((reviewer) => !approvedUserIds.has(reviewer.id))
        .map((reviewer) => {
          const latest = latestByUser.get(reviewer.id);
          return {
            ...reviewer,
            reviewStatus: latest
              ? resolveReviewStatus(latest.state)
              : 'pending' as ReviewStatus,
          };
        });

      const adoWorkItems = prAdoIds[i]
        .map((id) => adoMap.get(id))
        .filter((wi): wi is NonNullable<typeof wi> => !!wi);

      return { ...pr, pendingReviewers, adoWorkItems, repoName };
    }),
  );

  return prs;
}

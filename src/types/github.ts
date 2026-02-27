export type Repo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
};

export type Reviewer = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
};

export type Review = {
  id: number;
  user: Reviewer;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
};

export type PullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: Reviewer;
  requested_reviewers: Reviewer[];
  pendingReviewers: Reviewer[];
};

export type UserMapping = {
  githubUsername: string;
  teamsEmail: string;
};

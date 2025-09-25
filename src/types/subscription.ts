export interface Subscription {
  id: string;
  userId: number;
  username: string;
  repo?: string;
  lastCommitSha?: string;
  lastCheckTime: string;
  isActive: boolean;
}

export interface SubscriptionData {
  subscriptions: Subscription[];
  lastGlobalCheck: string;
}

export interface NewCommitNotification {
  subscription: Subscription;
  commit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  };
}

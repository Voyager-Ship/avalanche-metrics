// types/github-events.ts
// actor/org shape used in the sample
export interface Actor {
  id: number;
  login: string;
  display_login?: string | null;
  gravatar_id: string;
  url: string;
  avatar_url: string;
}

// repo shape used in the sample
export interface Repo {
  id: number;
  name: string; // e.g. "Owner/repo-name"
  url: string;  // api url
}

// payload for CreateEvent (from your sample)
export interface CreatePayload {
  ref: string | null;
  ref_type: string;        // "branch", "tag", etc.
  full_ref?: string | null;
  master_branch?: string | null;
  description?: string | null;
  pusher_type?: string | null;
  // add other fields if your CreateEvent payload expands
}

// payload for PushEvent (from your sample)
export interface PushPayload {
  repository_id: number;
  push_id: number;
  ref: string;    // e.g. "refs/heads/main"
  head: string;   // commit sha
  before: string; // previous commit sha
  // push events may include commits[], size, distinct_size, etc. — include if needed
}

// Generic fallback for other event payloads
export type GenericPayload = Record<string, any>;

// Discriminated union for Event
export interface BaseEvent {
  id: string;           // string id in your data, e.g. "5767215867"
  type: string;         // event type string, e.g. "PushEvent" | "CreateEvent"
  actor: Actor;
  repo: Repo;
  payload: GenericPayload;
  public: boolean;
  created_at: number;   // ISO timestamp like "2025-11-06T23:47:43Z"
  org?: Actor;          // org has same shape as actor in your sample
}

// Concrete event types
export interface CreateEvent extends BaseEvent {
  type: "CreateEvent";
  payload: CreatePayload;
}

export interface PushEvent extends BaseEvent {
  type: "PushEvent";
  payload: PushPayload;
}

// union type that covers the two known shapes + a generic fallback
export type Event = CreateEvent | PushEvent | BaseEvent;

// array type
export type Events = Event[];

export interface ProjectRepository {
  id: string;
  last_contribution: number;     // DATE → normalmente string (YYYY-MM-DD)
  first_contribution: number;    // TEXT
  repo_id: number | null;
  repo_name: string;
  user_id: string;
  commits: number
}
export interface ContributionsData { [user: string]: ProjectRepository[]}


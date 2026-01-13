
export interface InputNotification {
  id: string;
  title: string;
  type: string;
  content: string;
  content_type: string;
  short_description: string;
  template?: string;
  status: "pending" | "error" | "sent";
  audience: NotificationAudience;
}

export interface NotificationAudience {
  all: boolean
  users: string[];
  hackathons?: string[];
}

export interface DbNotification {
  id: string;
  title: string;
  type: string;
  content: string;
  content_type: string;
  short_description: string;
  template?: number;
  status: "pending" | "error" | "sent";
  last_error?: string;
  audience: string;
}

export type NotificationInbox = {
  id: number;
  audience: string | null;
  type: string | null;
  title: string | null;
  content: string | null;
  short_description: string | null;
  status: string | null;
};

export type NotificationEmail = {
  id: number;
  audience: string | null;
  type: string | null;
  title: string | null;
  content: string | null;
  short_description: string | null;
  status: string | null;
};

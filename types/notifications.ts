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
  all: boolean;
  users: string[];
  hackathons?: string[];
}

export interface DbNotification {
  id: number; // INTEGER IDENTITY
  audience: string; // TEXT NOT NULL
  type: string; // TEXT NOT NULL
  title: string; // TEXT NOT NULL
  content: string | null; // TEXT
  content_type: string | null; // TEXT
  short_description: string | null; // TEXT
  template: string | null; // TEXT
  status: "pending" | "error" | "sent" | 'sending' | "warning" | "userNotFound"; // TEXT NOT NULL (tu enum lógico)
  send_date: string | null; // DATE
  creator: string; // TEXT NOT NULL
  created_at: string; // DATE NOT NULL
  attemps: number;
}

export interface DbNotificationState {
  id: number;
  notification_id: number;
  status: "pending" | "error" | "sent" | "warning";
  error: string;
  send_date: Date;
  attemps: number;
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
export type NotificationContentType =
  | "text/plain"
  | "text/markdown"
  | "text/html"
  | "application/json";

type NotificationType = "advice" | "hackathon" | "system" | "marketing";

type RenderedInboxNotification = {
  type: NotificationType;
  title: string;
  content: string;
  short_description: string;
  status: "sent";
  audience: string;
};

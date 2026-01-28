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
  id: number;
  audience: string;
  type: string;
  title: string;
  content: string | null;
  content_type: string | null;
  short_description: string | null;
  template: string | null;
  status: "pending" | "retry" | "error" | "sent" | "sending" | "retrying";
  error?: string;
  send_date: string | null;
  creator: string;
  created_at: string;
  attemps: number;
}

export interface DbNotificationState {
  id: number;
  notification_id: number;
  status: "pending" | "error" | "sent" | "retry" | "sending" | "retrying";
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

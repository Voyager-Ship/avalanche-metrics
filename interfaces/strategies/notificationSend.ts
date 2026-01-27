import {
  DbNotification,
  DbNotificationState,
  NotificationInbox,
} from "../../types/notifications";

export interface NotificationSendStrategy {
  send(notifications: DbNotification[]): Promise<{ [key: string]: DbNotificationState }>;
}

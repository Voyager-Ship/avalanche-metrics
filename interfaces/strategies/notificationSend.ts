import {
  DbNotification,
  DbNotificationState,
  NotificationInbox,
} from "../../types/notifications";

export interface NotificationSendStrategy {
  send(notifications: DbNotification[], retryNotificationsStates: DbNotificationState[]): Promise<{ [key: string]: DbNotificationState }>;
}

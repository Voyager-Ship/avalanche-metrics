import { DbNotification } from "../../types/notifications";
import {
  NotificationSendStrategy,
  NotificationSendStrategyResponse,
} from "../../interfaces/strategies/notificationSend";

export class NotificationSendInboxStrategy implements NotificationSendStrategy {
  public async send(
    notifications: DbNotification[],
  ): Promise<NotificationSendStrategyResponse> {
    notifications.forEach((notifications) => {
      switch (notifications.type) {
        case "message":
          return this.sendMessage(notifications);
          break;
        case "course_completion":
          return this.sendCourseCompletion(notifications);
          break;
        default:
          return {
            success: false,
            error: `Unsupported notification type: ${notifications.type}`,
          };
      }
    });
    return { notifications: []};
  }
  private sendMessage(
    input: DbNotification,
  ): Promise<NotificationSendStrategyResponse> {
    switch (input.content_type) {
      case "text/plain":
        return Promise.resolve({
          notifications: [],
        });
      case "application/json":
        return Promise.resolve({
          notifications: [],
        });
        break;
      default:
        return Promise.resolve({
          notifications: [],
        });
    }
  }
  private sendCourseCompletion(
    input: DbNotification,
  ): Promise<NotificationSendStrategyResponse> {
    switch (input.content_type) {
      case "text/plain":
        return Promise.resolve({
          notifications: [],
        });
      case "application/json":
        return Promise.resolve({
          notifications: [],
        });
        break;
      default:
        return Promise.resolve({
          notifications: [],
        });
    }
  }
}

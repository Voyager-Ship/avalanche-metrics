import { Request, Response } from "express";
import NotificationsSender from "../../services/notifications/send";

const notificationsSender = new NotificationsSender() 

export const sendNotifications = async (req: Request, res: Response) => {

  try {
    const notifications = await notificationsSender.sendNotifications();
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({
      error: "failed to send notifications",
      details: String(err),
    });
  }
};

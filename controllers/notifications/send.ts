import { Request, Response } from "express";
import NotificationsSender from "../../services/notifications/send";

const notificationsSender = new NotificationsSender();

export const sendNotifications = async (req: Request, res: Response) => {
  const { notifications } = req.body;

  if (
    !notifications ||
    !Array.isArray(notifications) ||
    notifications.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "notifications field is required and must be an array" });
  }

  try {
    const events = await notificationsSender.sendNotifications(notifications);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: "failed to send notifications",
      details: String(err),
    });
  }
};

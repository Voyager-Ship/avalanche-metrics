import { Request, Response } from "express";
import NotificationsCreator from "../../services/notifications/create";

const notificationsCreator = new NotificationsCreator();

export const createNotifications = async (req: Request, res: Response) => {
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
    await notificationsCreator.createNotifications(notifications);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: "failed to create notifications",
      details: String(err),
    });
  }
};

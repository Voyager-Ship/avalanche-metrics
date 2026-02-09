import { Request, Response } from "express";
import NotificationsCreator from "../../services/notifications/create";
import { AuthedRequest } from "../../types/common";

const notificationsCreator = new NotificationsCreator();

export const createNotifications = async (req: Request, res: Response) => {
  const { notifications, authUser } = req.body as unknown as any;

  if (!authUser) {
    return res
      .status(400)
      .json({ error: "authUser field is required and must be an string" });
  }
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
    await notificationsCreator.createNotifications(authUser, notifications);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error at create notifications: ", err);
    return res.status(500).json({
      error: "Failed to create notifications",
    });
  }
};

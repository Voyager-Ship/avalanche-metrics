import { Request, Response } from "express";
import NotificationsGetter from "../../services/notifications/get";

const notificationsGetter = new NotificationsGetter();

export const getNotifications = async (req: Request, res: Response) => {
  const { users } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res
      .status(400)
      .json({ error: "users field is required and must be an array" });
  }

  try {
    const data = await notificationsGetter.getNotifications(users);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: "failed to get notifications",
      details: String(err),
    });
  }
};

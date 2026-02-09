import { Request, Response } from "express";
import NotificationsGetter from "../../services/notifications/get";

const notificationsGetter = new NotificationsGetter();

export const getNotifications = async (req: Request, res: Response) => {
  const { authUser } = req.body as unknown as any;

  if (!authUser) {
    return res.status(401).json({ error: "authUser field is required and must be an string" });
  }

  try {
    const data = await notificationsGetter.getNotifications([authUser]);
    return res.json(data);
  } catch (err: unknown) {
    console.error('Error at get notifications: ', err)
    return res.status(500).json({
      error: "Failed to get notifications"
    });
  }
};

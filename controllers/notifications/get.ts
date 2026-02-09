import { Request, Response } from "express";
import NotificationsGetter from "../../services/notifications/get";

const notificationsGetter = new NotificationsGetter();

type AuthedRequest = Request & { user?: { id: string } };

export const getNotifications = async (req: Request, res: Response) => {
  const userId: string | undefined = (req as AuthedRequest).user?.id;

  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const data = await notificationsGetter.getNotifications([userId]);
    return res.json(data);
  } catch (err: unknown) {
    console.error('Error at get notifications: ', err)
    return res.status(500).json({
      error: "Failed to get notifications"
    });
  }
};

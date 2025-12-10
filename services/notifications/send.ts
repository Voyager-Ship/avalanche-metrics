import GithubProvider from "../providers/github";
import { ParamsService } from "../infrastructure/params";
import { Notification } from "../../types/notifications";

export default class NotificationsSender {
  private paramsService: ParamsService;
  constructor() {
    this.paramsService = new ParamsService(new GithubProvider());
  }
  public async sendNotifications(notifications: Notification[]) {
  }
}

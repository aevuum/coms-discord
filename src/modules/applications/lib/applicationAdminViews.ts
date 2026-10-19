import type { Client } from "discord.js";

import { ApplicationAdminService } from "../service/applicationAdminService.js";
import { ApplicationTemplates } from "../service/applicationTemplates.js";
import { ApplicationAdminContainer } from "./applicationAdminContainer.js";

export class ApplicationAdminViews {
  public static async root(client: Client) {
    return ApplicationAdminContainer.root(await ApplicationTemplates.getRoles(client));
  }

  public static async role(client: Client, tagId: string) {
    const { role, questions, problem } = await ApplicationAdminService.getRole(client, tagId);

    return ApplicationAdminContainer.role(role, questions, problem, ApplicationAdminService.MAX_QUESTIONS);
  }

  public static async question(client: Client, tagId: string, index: number) {
    const { role, question, total } = await ApplicationAdminService.getQuestion(client, tagId, index);

    return ApplicationAdminContainer.question(role, question, index, total);
  }
}

import type { BaseInteraction, Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { ApplicationRoleRepository } from "../repositories/applicationRoleRepository.js";
import { ApplicationError, type ApplicationQuestion } from "../types/application.js";
import { ApplicationService } from "./applicationService.js";
import { ApplicationTemplates } from "./applicationTemplates.js";

export class ApplicationAdminService {
  public static readonly MANAGE_KEY = "manage.applications";

  public static readonly MAX_QUESTIONS = 15;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new ApplicationError("У вас нет доступа к настройке набора в команду.");
    }
  }

  public static async getRole(client: Client, tagId: string) {
    const role = await ApplicationTemplates.getRole(client, tagId);

    try {
      return { role, questions: await ApplicationTemplates.getQuestions(client, tagId), problem: null };
    } catch (error) {
      if (!(error instanceof ApplicationError)) {
        throw error;
      }

      return { role, questions: [] as ApplicationQuestion[], problem: error.message };
    }
  }

  public static async toggle(client: Client<true>, tagId: string) {
    const role = await ApplicationTemplates.getRole(client, tagId);

    await ApplicationRoleRepository.setOpen(tagId, !role.open);

    await ApplicationService.syncPanel(client).catch(() => null);
  }

  public static async add(client: Client, tagId: string, question: ApplicationQuestion) {
    const { questions } = await this.getRole(client, tagId);

    if (questions.length >= this.MAX_QUESTIONS) {
      throw new ApplicationError(`В анкете может быть не больше ${this.MAX_QUESTIONS} пунктов.`);
    }

    await this.save(tagId, [...questions, question]);

    return questions.length;
  }

  public static async edit(client: Client, tagId: string, index: number, question: ApplicationQuestion) {
    const questions = await this.load(client, tagId, index);

    questions[index] = question;

    await this.save(tagId, questions);
  }

  public static async move(client: Client, tagId: string, index: number, offset: number) {
    const questions = await this.load(client, tagId, index);
    const target = index + offset;

    if (target < 0 || target >= questions.length) {
      return index;
    }

    [questions[index], questions[target]] = [questions[target], questions[index]];

    await this.save(tagId, questions);

    return target;
  }

  public static async remove(client: Client, tagId: string, index: number) {
    const questions = await this.load(client, tagId, index);

    if (questions.length <= 1) {
      throw new ApplicationError("В анкете должен остаться хотя бы один пункт.");
    }

    questions.splice(index, 1);

    await this.save(tagId, questions);
  }

  public static async setRole(client: Client, tagId: string, roleId: string | null) {
    await ApplicationTemplates.getRole(client, tagId);

    if (roleId) {
      const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");
      const role = await guild?.roles.fetch(roleId).catch(() => null);

      if (!guild || !role || role.id === guild.id) {
        throw new ApplicationError("Роль не найдена.");
      }

      if (role.managed) {
        throw new ApplicationError("Эта роль управляется интеграцией или ботом, её нельзя выдавать вручную.");
      }

      const me = guild.members.me ?? (await guild.members.fetchMe());

      if (role.position >= me.roles.highest.position) {
        throw new ApplicationError("Роль бота должна быть выше этой роли в списке ролей сервера, иначе бот не сможет её выдать.");
      }
    }

    await ApplicationRoleRepository.setRole(tagId, roleId);
  }

  public static async reset(tagId: string) {
    await ApplicationRoleRepository.setQuestions(tagId, null);
  }

  public static async getQuestion(client: Client, tagId: string, index: number) {
    const { role } = await this.getRole(client, tagId);
    const questions = await this.load(client, tagId, index);

    return { role, question: questions[index], index, total: questions.length };
  }

  public static parse(title: string, hint: string, optional: boolean): ApplicationQuestion {
    const cleanTitle = title.replace(/\s+/g, " ").trim();

    if (!cleanTitle) {
      throw new ApplicationError("Название пункта не может быть пустым.");
    }

    return {
      title: cleanTitle.slice(0, 45),
      hint: hint.replace(/\s+/g, " ").trim() || null,
      optional,
    };
  }

  private static async load(client: Client, tagId: string, index: number) {
    const { questions } = await this.getRole(client, tagId);

    if (!Number.isInteger(index) || index < 0 || index >= questions.length) {
      throw new ApplicationError("Пункт не найден. Откройте должность заново.");
    }

    return questions.map((question) => ({ ...question }));
  }

  private static save(tagId: string, questions: ApplicationQuestion[]) {
    return ApplicationRoleRepository.setQuestions(tagId, questions);
  }
}

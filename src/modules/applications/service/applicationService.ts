import {
  MessageFlags,
  PermissionFlagsBits,
  ThreadAutoArchiveDuration,
  type Client,
  type GuildMember,
  type Message,
  type TopLevelComponent,
} from "discord.js";

import type { StaffApplication } from "../../../database/generated/prisma/client.js";

import {
  APPLICATION_CURATOR_TAG_ID,
  APPLICATION_PANEL_CHANNEL_ID,
  APPLICATION_REVIEW_CHANNEL_ID,
  APPLICATION_TRIAL_POST_MAX_LENGTH,
  APPLICATION_TRIAL_POST_MIN_LENGTH,
} from "../lib/applicationConfig.js";
import { ApplicationContainer } from "../lib/applicationContainer.js";
import { ApplicationAction, ApplicationCustomIds } from "../lib/applicationCustomIds.js";
import { ApplicationModal } from "../lib/applicationModal.js";
import { CuratorScenarios } from "../lib/curatorScenarios.js";
import { ApplicationRepository } from "../repositories/applicationRepository.js";
import {
  ApplicationError,
  type ApplicationAnswer,
  type ApplicationQuestion,
} from "../types/application.js";
import { ApplicationTemplates } from "./applicationTemplates.js";

export class ApplicationService {
  public static async syncPanel(client: Client<true>) {
    const channel = await client.channels.fetch(APPLICATION_PANEL_CHANNEL_ID);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      throw new Error(`Application panel channel ${APPLICATION_PANEL_CHANNEL_ID} is not a text channel`);
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [ApplicationContainer.panel(await ApplicationTemplates.getRoles(client))],
      allowedMentions: { parse: [] },
    };

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) => message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      await existing.edit(payload);

      return { message: existing, created: false };
    }

    return { message: await channel.send(payload), created: true };
  }

  public static async prepare(member: GuildMember, tagId: string) {
    const role = await ApplicationTemplates.getRole(member.client, tagId);

    if (!role.open) {
      throw new ApplicationError(`Набор на должность «${role.name}» сейчас закрыт.`);
    }

    if (role.roleId && member.roles.cache.has(role.roleId)) {
      throw new ApplicationError(`У вас уже есть должность «${role.name}».`);
    }

    if (await ApplicationRepository.findActive(member.id, tagId)) {
      throw new ApplicationError(`Ваша заявка на должность «${role.name}» уже на рассмотрении.`);
    }

    const questions = await ApplicationTemplates.getQuestions(member.client, tagId);

    return { role, questions };
  }

  public static async saveFirstPart(
    member: GuildMember,
    tagId: string,
    read: (index: number) => string | null,
  ) {
    const { role, questions } = await this.prepare(member, tagId);

    const answers = this.fill(
      questions.map((question) => ({ ...question, answer: null })),
      0,
      read,
    );

    return ApplicationRepository.createDraft({
      guildId: member.guild.id,
      userId: member.id,
      tagId,
      roleName: role.name,
      roleId: role.roleId,
      answers,
    });
  }

  public static async savePart(
    userId: string,
    applicationId: string,
    part: number,
    read: (index: number) => string | null,
  ) {
    const application = await this.loadDraft(userId, applicationId);

    const answers = this.fill(application.answers as ApplicationAnswer[], part, read);

    return ApplicationRepository.updateAnswers(application.id, answers);
  }

  public static async loadDraft(userId: string, applicationId: string) {
    const application = await ApplicationRepository.findById(applicationId);

    if (!application || application.userId !== userId) {
      throw new ApplicationError("Анкета не найдена. Начните заново из меню подачи заявок.");
    }

    if (application.status !== "DRAFT") {
      throw new ApplicationError("Эта анкета уже отправлена.");
    }

    return application;
  }

  public static questions(application: StaffApplication): ApplicationQuestion[] {
    return application.answers as ApplicationAnswer[];
  }

  public static isLastPart(application: StaffApplication, part: number) {
    return part >= ApplicationModal.totalParts(this.questions(application)) - 1;
  }

  public static async complete(client: Client, application: StaffApplication) {
    if (application.tagId !== APPLICATION_CURATOR_TAG_ID) {
      await this.publish(client, application, "DRAFT", null);

      return { awaitingPost: false, dmSent: false, application };
    }

    if (!(await ApplicationRepository.awaitPost(application.id, CuratorScenarios.random()))) {
      throw new ApplicationError("Эта анкета уже отправлена.");
    }

    const updated = (await ApplicationRepository.findById(application.id))!;

    const user = await client.users.fetch(updated.userId);

    const dmSent = await user
      .send({
        flags: MessageFlags.IsComponentsV2,
        components: [ApplicationContainer.trialRequest(updated)],
      })
      .then(() => true)
      .catch(() => false);

    return { awaitingPost: true, dmSent, application: updated };
  }

  public static async submitTrialPost(client: Client, userId: string, applicationId: string | null, text: string) {
    const application = applicationId
      ? await ApplicationRepository.findById(applicationId)
      : await ApplicationRepository.findAwaitingPost(userId);

    if (!application || application.userId !== userId) {
      throw new ApplicationError("Заявка не найдена.");
    }

    if (application.status !== "AWAITING_POST") {
      throw new ApplicationError("Пробный пост для этой заявки уже получен.");
    }

    const post = text.trim();

    if (post.length < APPLICATION_TRIAL_POST_MIN_LENGTH) {
      throw new ApplicationError(
        `Пост слишком короткий: ${post.length} из ${APPLICATION_TRIAL_POST_MIN_LENGTH} символов минимум. Допишите его и отправьте целиком ещё раз.`,
      );
    }

    if (post.length > APPLICATION_TRIAL_POST_MAX_LENGTH) {
      throw new ApplicationError(`Пост слишком длинный: максимум ${APPLICATION_TRIAL_POST_MAX_LENGTH} символов.`);
    }

    await this.publish(client, application, "AWAITING_POST", post);
  }

  public static async rate(member: GuildMember, applicationId: string, stars: number) {
    const application = await this.loadPending(applicationId);

    if (application.userId === member.id) {
      throw new ApplicationError("Нельзя оценивать собственную заявку.");
    }

    if (!(await this.canRate(member))) {
      throw new ApplicationError("Оценивать заявки может только команда проекта.");
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new ApplicationError("Некорректная оценка.");
    }

    await ApplicationRepository.vote(application.id, member.id, stars);

    return application;
  }

  public static async assertCanDecide(member: GuildMember, applicationId: string) {
    if (!this.isHighStaff(member)) {
      throw new ApplicationError("Принимать решение по заявкам может только администрация.");
    }

    return this.loadPending(applicationId);
  }

  public static async decide(
    member: GuildMember,
    applicationId: string,
    accepted: boolean,
    reason: string | null,
  ) {
    const application = await this.assertCanDecide(member, applicationId);

    if (application.userId === member.id) {
      throw new ApplicationError("Нельзя принимать решение по собственной заявке.");
    }

    if (
      !(await ApplicationRepository.decide(
        application.id,
        accepted ? "ACCEPTED" : "REJECTED",
        member.id,
        reason,
      ))
    ) {
      throw new ApplicationError("По этой заявке уже принято решение.");
    }

    const decided = (await ApplicationRepository.findById(application.id))!;

    let roleGranted = false;

    if (accepted && decided.roleId) {
      const candidate = await member.guild.members.fetch(decided.userId).catch(() => null);

      roleGranted = Boolean(
        await candidate?.roles
          .add(decided.roleId, `Заявка на должность принята: ${member.user.tag}`)
          .catch(() => null),
      );
    }

    const user = await member.client.users.fetch(decided.userId).catch(() => null);

    const notified = Boolean(
      await user
        ?.send({
          flags: MessageFlags.IsComponentsV2,
          components: [ApplicationContainer.decisionNotice(decided)],
        })
        .catch(() => null),
    );

    if (decided.threadId) {
      const thread = await member.guild.channels.fetch(decided.threadId).catch(() => null);

      if (thread?.isThread()) {
        await thread.setArchived(true).catch(() => null);
      }
    }

    return { application: decided, roleGranted, notified };
  }

  public static async render(application: StaffApplication) {
    return ApplicationContainer.review(application, await ApplicationRepository.votes(application.id));
  }

  public static isHighStaff(member: GuildMember) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  public static async canRate(member: GuildMember) {
    if (this.isHighStaff(member)) {
      return true;
    }

    const roles = await ApplicationTemplates.getRoles(member.client);

    return roles.some((role) => role.roleId && member.roles.cache.has(role.roleId));
  }

  private static async publish(
    client: Client,
    application: StaffApplication,
    from: "DRAFT" | "AWAITING_POST",
    trialPost: string | null,
  ) {
    if (!(await ApplicationRepository.claimPending(application.id, from, trialPost))) {
      throw new ApplicationError("Эта заявка уже отправлена.");
    }

    const pending = (await ApplicationRepository.findById(application.id))!;

    try {
      const channel = await client.channels.fetch(APPLICATION_REVIEW_CHANNEL_ID);

      if (!channel?.isSendable() || !channel.isTextBased() || channel.isDMBased() || channel.isThread()) {
        throw new Error(`Application review channel ${APPLICATION_REVIEW_CHANNEL_ID} is not a text channel`);
      }

      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [ApplicationContainer.review(pending, [])],
        allowedMentions: { parse: [] },
      });

      const user = await client.users.fetch(pending.userId).catch(() => null);

      const thread = await message
        .startThread({
          name: `${pending.roleName} · ${user?.username ?? pending.userId}`.slice(0, 100),
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        })
        .catch(() => null);

      if (thread) {
        for (const chunk of ApplicationContainer.threadChunks(pending)) {
          await thread.send({
            flags: MessageFlags.IsComponentsV2,
            components: [chunk],
            allowedMentions: { parse: [] },
          });
        }
      }

      const reviewed = await ApplicationRepository.setReviewMessage(pending.id, message.id, thread?.id ?? null);

      await message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [ApplicationContainer.review(reviewed, [])],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await ApplicationRepository.revert(pending.id, from);

      throw error;
    }
  }

  private static async loadPending(applicationId: string) {
    const application = await ApplicationRepository.findById(applicationId);

    if (!application) {
      throw new ApplicationError("Заявка не найдена.");
    }

    if (application.status !== "PENDING") {
      throw new ApplicationError("По этой заявке уже принято решение.");
    }

    return application;
  }

  private static fill(answers: ApplicationAnswer[], part: number, read: (index: number) => string | null) {
    const { start, end } = ApplicationModal.partRange(part);

    return answers.map((answer, index) =>
      index >= start && index < end ? { ...answer, answer: read(index)?.trim() || null } : answer,
    );
  }

  private static isPanel(message: Message) {
    const open = ApplicationCustomIds.build(ApplicationAction.Open);

    return JSON.stringify(message.components.map((component: TopLevelComponent) => component.toJSON())).includes(
      `"${open}"`,
    );
  }
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";
import type { ApplicationQuestion, ApplicationRole } from "../types/application.js";
import {
  ApplicationAdminAction,
  ApplicationAdminCustomIds,
  ApplicationAdminFields,
} from "./applicationAdminCustomIds.js";
import { TemplateParser } from "./templateParser.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:12784editor:1518587261707616407>";

export class ApplicationAdminContainer {
  public static root(roles: ApplicationRole[]) {
    const container = this.base("Набор в команду", [
      `${ARROW} Должности берутся из тегов форума с шаблонами. Здесь можно открыть или закрыть набор и поменять пункты анкеты.`,
      `${ARROW} Пока пункты не меняли, они читаются из поста-шаблона в форуме.`,
      "",
      ...(roles.length
        ? roles.map((role) => `${this.status(role)} **${role.name}** · ${this.source(role)}`)
        : ["-# В форуме нет ни одного тега."]),
    ]);

    if (roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.PickRole))
            .setPlaceholder("Выберите должность")
            .addOptions(
              roles.slice(0, 25).map((role) =>
                new StringSelectMenuOptionBuilder()
                  .setValue(role.tagId)
                  .setLabel(role.name.slice(0, 100))
                  .setDescription(`${role.open ? "Набор открыт" : "Набор закрыт"} · ${this.source(role)}`),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }

  public static role(
    role: ApplicationRole,
    questions: ApplicationQuestion[],
    problem: string | null,
    maxQuestions: number,
    roleName: string | null,
  ) {
    const container = this.base(role.name, [
      `${ARROW} Набор: ${role.open ? "🟢 **открыт**" : "🔴 **закрыт**"}`,
      `${ARROW} Пункты: ${this.source(role)}`,
      roleName
        ? `${ARROW} Роль при принятии: \`@${roleName}\` · ${role.roleManual ? "выбрана вручную" : "найдена по названию"}`
        : `${ARROW} Роль при принятии не задана: выберите её кнопкой «Роль при принятии», иначе выдавать придётся вручную.`,
      problem ? `-# ${problem}` : null,
      "",
      ...questions.map(
        (question, index) =>
          `\`${index + 1}.\` **${question.title}**${question.optional ? " · необязательный" : ""}${
            question.hint ? `\n-# ${TemplateParser.shorten(question.hint, 90)}` : ""
          }`,
      ),
    ]);

    if (questions.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.PickQuestion, role.tagId))
            .setPlaceholder("Выберите пункт для изменения")
            .addOptions(
              questions.map((question, index) =>
                new StringSelectMenuOptionBuilder()
                  .setValue(String(index))
                  .setLabel(`${index + 1}. ${question.title}`.slice(0, 100))
                  .setDescription(question.optional ? "Необязательный" : "Обязательный"),
              ),
            ),
        ),
      );
    }

    const buttons = [
      new ButtonBuilder()
        .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Toggle, role.tagId))
        .setLabel(role.open ? "Закрыть набор" : "Открыть набор")
        .setStyle(role.open ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Add, role.tagId))
        .setLabel("Добавить пункт")
        .setEmoji("<:6509addguild:1518587247769817088>")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(questions.length >= maxQuestions),
    ];

    if (role.customQuestions) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Reset, role.tagId))
          .setLabel("Вернуть из шаблона")
          .setStyle(ButtonStyle.Secondary),
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.RolePage, role.tagId, 0))
        .setLabel("Роль при принятии")
        .setEmoji("🎖️")
        .setStyle(ButtonStyle.Secondary),
      this.backButton(ApplicationAdminCustomIds.build(ApplicationAdminAction.Root)),
    );

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

    return container;
  }

  public static rolePicker(role: ApplicationRole, rolePage: RolePage, currentName: string | null) {
    const container = this.base(`${role.name} · роль при принятии`, [
      `${ARROW} Эту роль бот выдаст кандидату, когда администрация примет его заявку.`,
      `${ARROW} Сейчас: ${currentName ? `\`@${currentName}\` · ${role.roleManual ? "выбрана вручную" : "найдена по названию должности"}` : "не задана"}`,
      "-# Роль бота должна быть выше выбранной роли в списке ролей сервера, иначе бот не сможет её выдать.",
    ]);

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.RoleSet, role.tagId))
            .setPlaceholder(
              rolePage.totalPages > 1
                ? `Роль · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
                : "Выберите роль",
            )
            .addOptions(
              rolePage.roles.map((entry) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(entry.name.slice(0, 100))
                  .setValue(entry.id)
                  .setDefault(entry.id === role.roleId),
              ),
            ),
        ),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (rolePage.totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.RolePage, role.tagId, rolePage.page - 1))
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.RolePage, role.tagId, rolePage.page + 1))
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    if (role.roleManual) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.RoleAuto, role.tagId))
          .setLabel("По названию")
          .setStyle(ButtonStyle.Secondary),
      );
    }

    row.addComponents(this.backButton(ApplicationAdminCustomIds.build(ApplicationAdminAction.Role, role.tagId)));

    container.addActionRowComponents(row);

    return container;
  }

  public static question(role: ApplicationRole, question: ApplicationQuestion, index: number, total: number) {
    const container = this.base(`${role.name} · пункт ${index + 1}`, [
      `**${question.title}**`,
      question.hint ? `> ${question.hint}` : "-# Без подсказки.",
      `${ARROW} ${question.optional ? "Необязательный" : "Обязательный"}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Edit, role.tagId, index))
          .setLabel("Изменить")
          .setEmoji("<:984149edit:1518587370474176612>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Up, role.tagId, index))
          .setEmoji("⬆️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Down, role.tagId, index))
          .setEmoji("⬇️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index >= total - 1),
        new ButtonBuilder()
          .setCustomId(ApplicationAdminCustomIds.build(ApplicationAdminAction.Delete, role.tagId, index))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(total <= 1),
        this.backButton(ApplicationAdminCustomIds.build(ApplicationAdminAction.Role, role.tagId)),
      ),
    );

    return container;
  }

  public static modal(roleName: string, tagId: string, question?: ApplicationQuestion, index?: number) {
    const title = new TextInputBuilder()
      .setCustomId(ApplicationAdminFields.Title)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(45);

    const hint = new TextInputBuilder()
      .setCustomId(ApplicationAdminFields.Hint)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(200);

    if (question) {
      title.setValue(question.title);

      if (question.hint) {
        hint.setValue(question.hint.slice(0, 200));
      }
    }

    const optional = new StringSelectMenuBuilder()
      .setCustomId(ApplicationAdminFields.Optional)
      .setRequired(true)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setValue("required")
          .setLabel("Обязательный")
          .setDefault(!question?.optional),
        new StringSelectMenuOptionBuilder()
          .setValue("optional")
          .setLabel("Необязательный")
          .setDefault(Boolean(question?.optional)),
      );

    return new ModalBuilder()
      .setCustomId(
        question && index !== undefined
          ? ApplicationAdminCustomIds.build(ApplicationAdminAction.EditModal, tagId, index)
          : ApplicationAdminCustomIds.build(ApplicationAdminAction.AddModal, tagId),
      )
      .setTitle(TemplateParser.shorten(question ? `${roleName}: пункт ${index! + 1}` : `${roleName}: новый пункт`, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название пункта")
          .setDescription("До 45 символов, кандидат увидит его над полем ответа")
          .setTextInputComponent(title),
        new LabelBuilder()
          .setLabel("Подсказка")
          .setDescription("Что нужно написать. Первые 100 символов видны под названием")
          .setTextInputComponent(hint),
        new LabelBuilder().setLabel("Обязательность").setStringSelectMenuComponent(optional),
      );
  }

  private static status(role: ApplicationRole) {
    return role.open ? "🟢" : "🔴";
  }

  private static source(role: ApplicationRole) {
    return role.customQuestions ? "свои пункты" : "пункты из шаблона";
  }

  private static backButton(customId: string) {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel("Назад")
      .setEmoji("<:172852arrowleft:1518587345249763452>")
      .setStyle(ButtonStyle.Secondary);
  }

  private static base(title: string, lines: (string | null)[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${HEADER} ${title}`, "", ...lines.filter((line) => line !== null)].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    return container;
  }
}

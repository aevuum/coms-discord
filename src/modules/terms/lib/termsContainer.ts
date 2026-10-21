import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { TERMS_CONTACT_EMAIL, TERMS_LINKS, TermsAction, TermsCustomIds } from "./termsConfig.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";

export class TermsContainer {
  public static prompt() {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:scroll:1562262856039145553> Прежде чем начать",
          "Чтобы пользоваться ботом CoMS, ознакомьтесь с документами проекта и подтвердите согласие с ними.",
          "",
          `${ARROW} **Условия использования** — правила работы с ботом, игровые ценности, розыгрыши, ответственность.`,
          `${ARROW} **Политика обработки персональных данных** — какие данные обрабатывает бот, зачем и как долго хранит.`,
          `${ARROW} **Согласие на обработку персональных данных** — в том числе на их передачу за пределы РФ.`,
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(this.links());

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "-# Нажимая «Принимаю», вы подтверждаете, что прочитали документы, принимаете Условия использования и даёте согласие на обработку персональных данных. Если вам нет 14 лет, согласие должен дать ваш родитель или законный представитель.",
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TermsCustomIds.build(TermsAction.Accept))
          .setLabel("Принимаю")
          .setEmoji("<:checkmark_teal:1562262873902817401>")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(TermsCustomIds.build(TermsAction.Decline))
          .setLabel("Не принимаю")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static accepted() {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `${SUCCESS} **Спасибо! Согласие сохранено.**`,
            "Теперь повторите команду или действие — бот полностью доступен.",
            "-# Посмотреть документы или отозвать согласие можно командой /terms.",
          ].join("\n"),
        ),
      );
  }

  public static declined() {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `${ERROR} **Без согласия бот недоступен.**`,
            "Если передумаете, просто воспользуйтесь ботом ещё раз — окно согласия появится снова.",
          ].join("\n"),
        ),
      );
  }

  public static overview(acceptedAt: Date | null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:scroll:1562262856039145553> Документы проекта",
          acceptedAt
            ? `${ARROW} Вы приняли текущую редакцию <t:${Math.floor(acceptedAt.getTime() / 1000)}:f>.`
            : `${ARROW} Вы ещё не приняли текущую редакцию документов.`,
          `${ARROW} Запросы о ваших данных, их уточнении и удалении: ${TERMS_CONTACT_EMAIL}`,
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(this.links());

    if (acceptedAt) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TermsCustomIds.build(TermsAction.Withdraw))
            .setLabel("Отозвать согласие")
            .setStyle(ButtonStyle.Danger),
        ),
      );
    }

    return container;
  }

  public static withdrawConfirm() {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "## Отозвать согласие?",
            `${ARROW} Бот перестанет быть для вас доступен, пока вы снова не примете документы.`,
            `${ARROW} Чтобы удалить уже сохранённые данные (персонажей, баланс, статистику), напишите на ${TERMS_CONTACT_EMAIL} и укажите ваш Discord ID. Данные будут удалены в течение 30 дней и не восстанавливаются.`,
          ].join("\n"),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TermsCustomIds.build(TermsAction.WithdrawConfirm))
            .setLabel("Отозвать")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(TermsCustomIds.build(TermsAction.WithdrawCancel))
            .setLabel("Отмена")
            .setStyle(ButtonStyle.Secondary),
        ),
      );
  }

  public static withdrawn() {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `${SUCCESS} **Согласие отозвано.**`,
            `Чтобы удалить сохранённые данные, напишите на ${TERMS_CONTACT_EMAIL}.`,
          ].join("\n"),
        ),
      );
  }

  private static links() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Условия использования").setURL(TERMS_LINKS.terms),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Политика данных").setURL(TERMS_LINKS.privacy),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Согласие").setURL(TERMS_LINKS.consent),
    );
  }
}

import { Storage } from "../../../lib/storage.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { RollEntry } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { RollService } from "../service/rollService.js";
import type { RollKindMeta } from "../types/rolls.js";
import { RollAdminAction, RollCustomIds, RollModalFields } from "./rollCustomIds.js";
import { ROLL_KINDS } from "./rollKinds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_races:1562521787571634256>";

export class RollAdminContainer {
  public static root(counts: Record<string, number>) {
    const container = this.base("Расы и трейты", [
      `${ARROW} Здесь настраивается, что может выпасть по командам /race и /trait.`,
      `${ARROW} Каждому редкому варианту задаётся шанс в процентах. Всё, что не выпало, уходит в вариант по умолчанию: для рас это человек, для трейтов — отсутствие особенностей.`,
      "",
      ...Object.values(ROLL_KINDS).map(
        (meta) => `${meta.emoji} **${meta.plural}** · вариантов: ${counts[meta.slug] ?? 0}`,
      ),
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...Object.values(ROLL_KINDS).map((meta) =>
          new ButtonBuilder()
            .setCustomId(RollCustomIds.admin(RollAdminAction.Kind, meta.slug))
            .setLabel(meta.plural)
            .setEmoji(meta.emoji)
            .setStyle(ButtonStyle.Primary),
        ),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static list(meta: RollKindMeta, entries: RollEntry[]) {
    const rare = entries.filter((entry) => !entry.isDefault).reduce((sum, entry) => sum + entry.chance, 0);

    const container = this.base(meta.plural, [
      `${ARROW} Редкие варианты выпадают в сумме с шансом **${RollService.formatChance(rare)}**.`,
      "",
      ...entries.map((entry) => this.line(entry, entries)),
    ]);

    if (entries.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(RollCustomIds.admin(RollAdminAction.View))
            .setPlaceholder(`Выберите ${meta.accusative} для настройки`)
            .addOptions(
              entries.slice(0, 25).map((entry) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setValue(entry.id)
                  .setLabel(entry.name.slice(0, 100))
                  .setDescription(
                    entry.isDefault
                      ? `По умолчанию · ${RollService.formatChance(RollService.effectiveChance(entry, entries))}`
                      : `Шанс ${RollService.formatChance(entry.chance)}`,
                  );

                if (entry.emoji) {
                  option.setEmoji(entry.emoji);
                }

                return option;
              }),
            ),
        ),
      );
    }

    const other = Object.values(ROLL_KINDS).find((kind) => kind.slug !== meta.slug)!;

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(RollCustomIds.admin(RollAdminAction.Add, meta.slug))
          .setLabel("Добавить")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success)
          .setDisabled(entries.length >= RollService.MAX_ENTRIES),
        new ButtonBuilder()
          .setCustomId(RollCustomIds.admin(RollAdminAction.Kind, other.slug))
          .setLabel(other.plural)
          .setEmoji(other.emoji)
          .setStyle(ButtonStyle.Secondary),
        this.backButton(),
      ),
    );

    return container;
  }

  public static view(meta: RollKindMeta, entry: RollEntry, entries: RollEntry[]) {
    const chance = RollService.effectiveChance(entry, entries);

    const container = this.base(`${entry.emoji ? `${entry.emoji} ` : ""}${entry.name}`, [
      `-# ${meta.single}${entry.isDefault ? " · по умолчанию" : ""}`,
      entry.description ? `> ${entry.description}` : "-# Без описания.",
      `${ARROW} Шанс: **${RollService.formatChance(chance)}** · ${"★".repeat(RollService.stars(chance))}`,
      entry.isDefault ? `-# ${meta.defaultHint} Шанс считается сам: 100% минус редкие варианты.` : null,
      `${ARROW} Картинка: ${Storage.media(entry.imagePath, entry.imageUrl) ? "есть" : "нет"}`,
    ]);

    if (Storage.media(entry.imagePath, entry.imageUrl)) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(Storage.media(entry.imagePath, entry.imageUrl)!)),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(RollCustomIds.admin(RollAdminAction.Edit, entry.id))
          .setLabel("Изменить")
          .setEmoji("<:984149edit:1518587370474176612>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(RollCustomIds.admin(RollAdminAction.Delete, entry.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(entry.isDefault),
        this.backButton("Назад", RollCustomIds.admin(RollAdminAction.Kind, meta.slug)),
      ),
    );

    return container;
  }

  public static modal(meta: RollKindMeta, entry?: RollEntry) {
    const input = (id: string, style: TextInputStyle, required: boolean, max: number, value?: string | null) => {
      const field = new TextInputBuilder()
        .setCustomId(id)
        .setStyle(style)
        .setRequired(required)
        .setMaxLength(max);

      if (value) {
        field.setValue(value);
      }

      return field;
    };

    const modal = new ModalBuilder()
      .setCustomId(
        entry
          ? RollCustomIds.admin(RollAdminAction.EditModal, entry.id)
          : RollCustomIds.admin(RollAdminAction.CreateModal, meta.slug),
      )
      .setTitle((entry ? `${meta.single}: ${entry.name}` : `Новый вариант · ${meta.plural}`).slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название")
          .setTextInputComponent(input(RollModalFields.Name, TextInputStyle.Short, true, 40, entry?.name)),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Обычный эмодзи или эмодзи с сервера, можно оставить пустым")
          .setTextInputComponent(input(RollModalFields.Emoji, TextInputStyle.Short, false, 64, entry?.emoji)),
        new LabelBuilder()
          .setLabel("Описание")
          .setTextInputComponent(
            input(RollModalFields.Description, TextInputStyle.Paragraph, false, 500, entry?.description),
          ),
        new LabelBuilder()
          .setLabel("Картинка или гифка")
          .setDescription("Ссылка https:// на картинку или гифку, бот сохранит копию у себя")
          .setTextInputComponent(input(RollModalFields.ImageUrl, TextInputStyle.Short, false, 500, entry ? Storage.media(entry.imagePath, entry.imageUrl) : null)),
      );

    if (!entry?.isDefault) {
      modal.addLabelComponents(
        new LabelBuilder()
          .setLabel("Шанс выпадения, %")
          .setDescription("Например 0.5 — один раз из двухсот. Чем меньше, тем реже")
          .setTextInputComponent(
            input(
              RollModalFields.Chance,
              TextInputStyle.Short,
              true,
              6,
              entry ? String(entry.chance / 100) : null,
            ).setPlaceholder("0.5"),
          ),
      );
    }

    return modal;
  }

  public static deleteConfirm(meta: RollKindMeta, entry: RollEntry) {
    const container = this.base("Удаление варианта", [
      `${ARROW} Удалить ${meta.accusative} **${entry.name}**? Шанс этого варианта перейдёт варианту по умолчанию.`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(RollCustomIds.admin(RollAdminAction.DeleteConfirm, entry.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        this.backButton("Отмена", RollCustomIds.admin(RollAdminAction.View, entry.id)),
      ),
    );

    return container;
  }

  private static line(entry: RollEntry, entries: RollEntry[]) {
    const chance = RollService.effectiveChance(entry, entries);

    return `${entry.emoji ?? ARROW} **${entry.name}** — ${RollService.formatChance(chance)}${entry.isDefault ? " · по умолчанию" : ""}`;
  }

  private static backButton(label = "Назад", customId = RollCustomIds.admin(RollAdminAction.Root)) {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
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

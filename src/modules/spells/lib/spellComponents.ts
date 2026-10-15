import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { Spell } from "../../../database/generated/prisma/client.js";

import { SpellMode, type SpellPage } from "../types/spells.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { Mana } from "./mana.js";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "./spellConfig.js";
import { SpellCustomIds, SpellModalFields } from "./spellCustomIds.js";

export class SpellComponents {
  public static spellSelect(page: SpellPage, mode: SpellMode) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(SpellCustomIds.select(mode, page.page))
        .setPlaceholder("Выберите заклинание")
        .addOptions(
          page.spells.map((spell) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(spell.name.slice(0, 100))
              .setDescription(
                `${spell.incantations[0] ?? ""} · ${Mana.spellCost(spell)} маны`.slice(
                  0,
                  100,
                ),
              )
              .setValue(spell.id),
          ),
        ),
    );
  }

  public static navigation(page: SpellPage, mode: SpellMode) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(SpellCustomIds.page(mode, page.page - 1))
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page.page <= 0),

      new ButtonBuilder()
        .setCustomId(SpellCustomIds.page(mode, page.page + 1))
        .setLabel("Вперёд")
        .setEmoji("<:48765whitearrow:1518587298281685173>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page.page >= page.totalPages - 1),
    );

    if (mode === SpellMode.Manage) {
      row.addComponents(
        ManageComponents.homeButton(),
        new ButtonBuilder()
          .setCustomId(SpellCustomIds.create())
          .setLabel("Создать")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),
      );
    }

    return row;
  }

  public static detailActions(spell: Spell, mode: SpellMode, page: number) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (mode === SpellMode.Manage) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(SpellCustomIds.edit(spell.id, page))
          .setLabel("Изменить")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(SpellCustomIds.delete(spell.id, page))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
      );
    }

    row.addComponents(this.backButton(mode, page));

    return row;
  }

  public static deleteActions(spell: Spell, page: number) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(SpellCustomIds.deleteConfirm(spell.id, page))
        .setLabel("Удалить навсегда")
        .setEmoji("<:14605delete:1518587266505642074>")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(SpellCustomIds.open(SpellMode.Manage, spell.id, page))
        .setLabel("Отмена")
        .setEmoji("<:12138cross:1518587259669053591>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static backRow(mode: SpellMode, page: number) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.backButton(mode, page),
    );
  }

  public static spellModal(spell?: Spell, page = 0) {
    const name = new TextInputBuilder()
      .setCustomId(SpellModalFields.Name)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(80)
      .setPlaceholder("Чары Патронуса");

    const incantations = new TextInputBuilder()
      .setCustomId(SpellModalFields.Incantations)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(600)
      .setPlaceholder("Экспекто Патронум, Expecto Patronum");

    const manaCost = new TextInputBuilder()
      .setCustomId(SpellModalFields.ManaCost)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(4)
      .setPlaceholder("Пусто — по сложности");

    const imageUrl = new TextInputBuilder()
      .setCustomId(SpellModalFields.ImageUrl)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(500)
      .setPlaceholder("https://… (пусто — гифка из Giphy)");

    if (spell) {
      name.setValue(spell.name);
      incantations.setValue(spell.incantations.join(", "));

      if (spell.manaCost !== null) {
        manaCost.setValue(String(spell.manaCost));
      }

      if (spell.imageUrl) {
        imageUrl.setValue(spell.imageUrl);
      }
    }

    const difficulty = new StringSelectMenuBuilder()
      .setCustomId(SpellModalFields.Difficulty)
      .setPlaceholder("Выберите сложность")
      .setRequired(true)
      .addOptions(
        DIFFICULTY_ORDER.map((level) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(DIFFICULTY_LABELS[level])
            .setDescription(
              `${Mana.spellCost({ difficulty: level, manaCost: null })} маны`,
            )
            .setValue(level)
            .setDefault(spell?.difficulty === level),
        ),
      );

    return new ModalBuilder()
      .setCustomId(
        spell
          ? SpellCustomIds.editModal(spell.id, page)
          : SpellCustomIds.createModal(),
      )
      .setTitle(spell ? "Изменение заклинания" : "Новое заклинание")
      .addLabelComponents(
        new LabelBuilder().setLabel("Название").setTextInputComponent(name),
        new LabelBuilder()
          .setLabel("Формулы")
          .setDescription("Варианты написания через запятую")
          .setTextInputComponent(incantations),
        new LabelBuilder()
          .setLabel("Сложность")
          .setStringSelectMenuComponent(difficulty),
        new LabelBuilder()
          .setLabel("Стоимость маны")
          .setDescription("Оставьте пустым, чтобы считать по сложности")
          .setTextInputComponent(manaCost),
        new LabelBuilder()
          .setLabel("Картинка или гифка")
          .setDescription("Прямая https-ссылка на изображение")
          .setTextInputComponent(imageUrl),
      );
  }

  private static backButton(mode: SpellMode, page: number) {
    return new ButtonBuilder()
      .setCustomId(SpellCustomIds.page(mode, page))
      .setLabel("К списку")
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}

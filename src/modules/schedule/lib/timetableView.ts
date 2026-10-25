import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { Character } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { LessonRepository } from "../repositories/lessonRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { ScheduleError } from "../types/schedule.js";
import { BACK, SCHEDULE_HEADER, text } from "./lessonCard.js";
import { MoscowTime } from "./moscowTime.js";
import { TIMETABLE_FILE, TimetableCard } from "./timetableCard.js";

export const TIMETABLE_PREFIX = "tcard";
export const MAX_WEEK_OFFSET = 8;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NEXT = "<:48765whitearrow:1518587298281685173>";

export enum TimetableAction {
  Week = "w",
  Character = "c",
}

export class TimetableView {
  public static customId(action: TimetableAction, ...args: (string | number)[]) {
    return [TIMETABLE_PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== TIMETABLE_PREFIX || !Object.values(TimetableAction).includes(action as TimetableAction)) {
      return null;
    }

    return { action: action as TimetableAction, args };
  }

  public static async open(discordId: string, guildId: string, characterId: string | null, offset: number) {
    const characters = await ScheduleRepository.ownCharacters(discordId);

    if (!characters.length) {
      throw new ScheduleError("Расписание показывается для живых персонажей, а у вас таких нет.");
    }

    const week = Math.max(-MAX_WEEK_OFFSET, Math.min(MAX_WEEK_OFFSET, Number.isInteger(offset) ? offset : 0));
    const character = characters.find((entry) => entry.id === characterId) ?? (characters.length === 1 ? characters[0] : null);

    if (!character) {
      return { components: [this.picker(characters, week)], files: [] };
    }

    const weekStart = new Date(TimetableCard.weekStart(new Date()).getTime() + week * WEEK_MS);
    const lessons = await LessonRepository.week(guildId, weekStart, new Date(weekStart.getTime() + WEEK_MS), character.id);

    const image = await TimetableCard.render({
      faculty: character.faculty,
      ownerName: character.rpName,
      weekStart,
      legend: "student",
      lessons: lessons.map((lesson) => ({
        startsAt: lesson.startsAt,
        subjectId: lesson.subjectId,
        subjectName: lesson.subject.name,
        note: lesson.topic,
        enrolled: lesson.enrollments.length > 0,
        faded: false,
      })),
    });

    const enrolled = lessons.filter((lesson) => lesson.enrollments.length).length;

    return {
      components: [this.card(character, characters, week, weekStart, lessons.length, enrolled)],
      files: [new AttachmentBuilder(image, { name: TIMETABLE_FILE })],
    };
  }

  private static card(character: Character, characters: Character[], week: number, weekStart: Date, total: number, enrolled: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const end = new Date(weekStart.getTime() + WEEK_MS - 1);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${TIMETABLE_FILE}`)
          .setDescription(`Расписание ${character.rpName} на неделю ${MoscowTime.format(weekStart).slice(0, 5)}–${MoscowTime.format(end).slice(0, 5)}`),
      ),
    );

    text(container, [
      `-# ${SCHEDULE_HEADER} Занятий на неделе: **${total}**, вы записаны на **${enrolled}**. Записаться можно в карточке занятия в его кабинете.`,
    ]);

    if (characters.length > 1) {
      container.addActionRowComponents(this.characterSelect(characters, character.id, week));
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.customId(TimetableAction.Week, character.id, week - 1))
          .setLabel("Прошлая неделя")
          .setEmoji(BACK)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(week <= -MAX_WEEK_OFFSET),
        new ButtonBuilder()
          .setCustomId(this.customId(TimetableAction.Week, character.id, 0, "now"))
          .setLabel("Эта неделя")
          .setStyle(week === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(week === 0),
        new ButtonBuilder()
          .setCustomId(this.customId(TimetableAction.Week, character.id, week + 1))
          .setLabel("Следующая неделя")
          .setEmoji(NEXT)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(week >= MAX_WEEK_OFFSET),
      ),
    );

    return container;
  }

  private static picker(characters: Character[], week: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`# ${SCHEDULE_HEADER} Расписание занятий`, "", "Выберите персонажа — карточка придёт с его факультетом и отметками о записи."]);
    container.addActionRowComponents(this.characterSelect(characters, null, week));

    return container;
  }

  private static characterSelect(characters: Character[], current: string | null, week: number) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(this.customId(TimetableAction.Character, week))
        .setPlaceholder("Выберите персонажа")
        .addOptions(
          characters.slice(0, 25).map((character) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setDescription(CharacterFormatter.facultyLabel(character.faculty))
              .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
              .setValue(character.id)
              .setDefault(character.id === current),
          ),
        ),
    );
  }
}

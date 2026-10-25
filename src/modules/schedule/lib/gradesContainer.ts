import {
  ActionRowBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { Character, Subject } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import type { ReportCard } from "../service/gradeService.js";
import { GRADES_FILE } from "./gradeCard.js";
import { ARROW, PAD, text } from "./lessonCard.js";
import { MoscowTime } from "./moscowTime.js";
import { GradesAction, ScheduleCustomIds } from "./scheduleCustomIds.js";

export const GRADES_HEADER = "<:teal_feather:1562262848598577284>";
const ALL = "all";
const MONTHS_BACK = 12;

export class GradesContainer {
  public static picker(ownerId: string, characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`# ${GRADES_HEADER} Табель успеваемости`, "", `${ARROW} Выберите персонажа.`, `-# ${PAD}`]);

    container.addActionRowComponents(this.characterSelect(ownerId, characters, null, ALL, MoscowTime.monthKey(new Date())));

    return container;
  }

  public static view(report: ReportCard, characters: Character[], subjects: Subject[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${GRADES_FILE}`)
          .setDescription(`Табель успеваемости ${report.character.rpName}, ${MoscowTime.monthLabel(report.month)}`),
      ),
    );

    const subjectKey = report.subjectId ?? ALL;
    const { ownerId, id } = report.character;

    if (characters.length > 1) {
      container.addActionRowComponents(this.characterSelect(ownerId, characters, id, subjectKey, report.month));
    }

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ScheduleCustomIds.grades(GradesAction.Subject, ownerId, id, subjectKey, report.month))
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Все предметы").setValue(ALL).setDefault(subjectKey === ALL),
            ...subjects.slice(0, 24).map((subject) => {
              const option = new StringSelectMenuOptionBuilder()
                .setLabel(subject.name.slice(0, 100))
                .setValue(subject.id)
                .setDefault(subject.id === subjectKey);

              return subject.emoji ? option.setEmoji(subject.emoji) : option;
            }),
          ),
      ),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ScheduleCustomIds.grades(GradesAction.Month, ownerId, id, subjectKey, report.month))
          .addOptions(
            MoscowTime.recentMonths(MONTHS_BACK).map((month) =>
              new StringSelectMenuOptionBuilder().setLabel(MoscowTime.monthLabel(month)).setValue(month).setDefault(month === report.month),
            ),
          ),
      ),
    );

    return container;
  }

  private static characterSelect(ownerId: string, characters: Character[], current: string | null, subject: string, month: string) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(ScheduleCustomIds.grades(GradesAction.Character, ownerId, current ?? "none", subject, month))
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

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import type {
  Artifact,
  ArtifactMaterial,
  ArtifactRune,
  Character,
  Rune,
} from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import type { CraftPreview, RecipeWithRelations } from "../service/artifactService.js";
import { ArtifactAction, ArtifactCustomIds } from "./artifactCustomIds.js";
import {
  ARTIFACT_STATUS_LABELS,
  RUNE_ARROW,
  RUNE_BACK,
  RUNE_ERROR,
  RUNE_PAD,
  RUNE_SUCCESS,
  RuneFormat,
} from "./runeFormat.js";
import { OUTCOME_LABELS } from "./runeRules.js";

export const ARTIFACT_HEADER = "<:inventory:1562485572008673340>";

export type ArtifactHomeData = {
  artifacts: (Artifact & { runes: ArtifactRune[] })[];
  recipes: { recipe: RecipeWithRelations; learnedAll: boolean }[];
};

const text = (container: ContainerBuilder, lines: (string | null | false)[]) =>
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.filter((line): line is string => typeof line === "string").join("\n")),
  );

const back = (characterId: string, label = "Назад") =>
  new ButtonBuilder()
    .setCustomId(ArtifactCustomIds.build(ArtifactAction.Home, characterId))
    .setLabel(label)
    .setEmoji(RUNE_BACK)
    .setStyle(ButtonStyle.Secondary);

export class ArtifactContainer {
  public static picker(characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`# ${ARTIFACT_HEADER} Артефакты`, "", `${RUNE_ARROW} Выберите персонажа.`, `-# ${RUNE_PAD}`]);

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ArtifactCustomIds.build(ArtifactAction.Pick))
          .setPlaceholder("Выберите персонажа")
          .addOptions(
            characters.slice(0, 25).map((character) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(character.rpName.slice(0, 100))
                .setDescription(CharacterFormatter.facultyLabel(character.faculty))
                .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
                .setValue(character.id),
            ),
          ),
      ),
    );

    return container;
  }

  public static home(character: Character, data: ArtifactHomeData, canGoBack: boolean) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${ARTIFACT_HEADER} Артефакты · ${character.rpName}`,
        `-# Создано артефактов: **${data.artifacts.length}** · доступных рецептов: ${data.recipes.length}`,
        `-# ${RUNE_PAD}`,
      ].join("\n"),
    );

    const avatar = Storage.media(character.avatarPath, character.avatarUrl);

    if (avatar) {
      container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    text(container, [
      data.artifacts.length
        ? data.artifacts
            .map(
              (artifact) =>
                `${RUNE_ARROW} **${artifact.name}** · ${ARTIFACT_STATUS_LABELS[artifact.status]} · нагрузка ${artifact.load}/${artifact.capacity} · качество ${artifact.quality}`,
            )
            .join("\n")
        : `${RUNE_ARROW} У персонажа пока нет артефактов.`,
      "-# Заготовка и материалы берутся из инвентаря персонажа и тратятся при создании. Руны рецепта должны быть изучены в /rune.",
    ]);

    if (data.artifacts.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ArtifactCustomIds.build(ArtifactAction.Artifact, character.id))
            .setPlaceholder("Открыть артефакт")
            .addOptions(
              data.artifacts.slice(0, 25).map((artifact) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(artifact.name.slice(0, 100))
                  .setDescription(`Нагрузка ${artifact.load}/${artifact.capacity} · качество ${artifact.quality}`)
                  .setValue(artifact.id),
              ),
            ),
        ),
      );
    }

    if (data.recipes.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ArtifactCustomIds.build(ArtifactAction.Recipe, character.id))
            .setPlaceholder("Создать артефакт: выберите рецепт")
            .addOptions(
              data.recipes.slice(0, 25).map(({ recipe, learnedAll }) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(recipe.name.slice(0, 100))
                  .setDescription(
                    `${recipe.blank.name} · ${recipe.runes.map((entry) => entry.rune.name).join(", ")}${learnedAll ? "" : " · не все руны изучены"}`.slice(0, 100),
                  )
                  .setValue(recipe.id),
              ),
            ),
        ),
      );
    } else {
      text(container, ["-# Утверждённых рецептов артефактов пока нет."]);
    }

    if (canGoBack) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ArtifactCustomIds.build(ArtifactAction.Back))
            .setLabel("Другой персонаж")
            .setEmoji(RUNE_BACK)
            .setStyle(ButtonStyle.Secondary),
        ),
      );
    }

    return container;
  }

  public static craftPreview(
    characterId: string,
    preview: CraftPreview,
    materials: ArtifactMaterial[],
    operationId: string | null,
  ) {
    const { recipe } = preview;
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${ARTIFACT_HEADER} ${recipe.name}`,
      `> ${recipe.effect}`,
      "",
      `**Заготовка:** ${recipe.blank.name} · вместимость ${recipe.blank.baseCapacity} × ${recipe.blank.qualityPercent}%`,
      `**Руны:** ${preview.runeLoads
        .map((entry) => {
          const rune = recipe.runes.find((item) => item.runeKey === entry.runeKey)!.rune;
          return `${rune.emoji} ${rune.name}${entry.critical ? "*" : ""} (${entry.load})`;
        })
        .join(", ")}`,
      `**Нагрузка / вместимость:** ${preview.load} / ${preview.capacity}${preview.overloaded ? ` · ${RUNE_ERROR} перегрузка` : ""}`,
      `**Материалы:**`,
      ...preview.needs.map((need) => `${need.have >= need.need ? RUNE_SUCCESS : RUNE_ERROR} ${need.name}: ${need.have}/${need.need}`),
      `**Решающее владение:** ${preview.mastery}${recipe.runes.some((entry) => entry.critical) ? " (слабейшая критическая руна)" : " (слабейшая руна)"}`,
      `**Риск неудачи:** ${RuneFormat.risk(preview.risk)} · при неудаче: ${OUTCOME_LABELS[recipe.failureOutcome]}`,
      preview.overloaded ? `**При перегрузке:** ${OUTCOME_LABELS[recipe.overloadOutcome]}` : null,
      preview.blockers.length ? `\n${preview.blockers.map((entry) => `${RUNE_ERROR} ${entry}`).join("\n")}` : null,
      "-# * — критическая руна. Дополнительные материалы из меню ниже повышают вместимость и тоже тратятся.",
    ]);

    if (materials.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ArtifactCustomIds.build(ArtifactAction.Extras, characterId, recipe.id))
            .setPlaceholder("Дополнительные материалы для вместимости")
            .setMinValues(0)
            .setMaxValues(Math.min(materials.length, 10))
            .addOptions(
              materials.slice(0, 25).map((material) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(material.name.slice(0, 100))
                  .setDescription(`Вместимость ${material.capacityBonus >= 0 ? "+" : ""}${material.capacityBonus}`)
                  .setValue(material.id)
                  .setDefault(preview.extraMaterialIds.includes(material.id)),
              ),
            ),
        ),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (operationId) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(ArtifactCustomIds.build(ArtifactAction.Craft, characterId, operationId))
          .setLabel("Создать артефакт")
          .setEmoji(RUNE_SUCCESS)
          .setStyle(ButtonStyle.Success),
      );
    }

    row.addComponents(back(characterId));
    container.addActionRowComponents(row);

    return container;
  }

  public static craftResult(
    characterId: string,
    result: { preview: CraftPreview; roll: number; success: boolean; outcome: string | null; quality: number | null; artifact: Artifact | null },
  ) {
    const { preview } = result;
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${result.success ? RUNE_SUCCESS : RUNE_ERROR} ${preview.recipe.name}`,
      `-# Бросок ${result.roll} против риска ${preview.risk}%${preview.overloaded ? " · перегрузка" : ""}`,
      "",
      result.success
        ? `Артефакт создан. **Качество:** ${result.quality}/100\n> ${preview.recipe.effect}`
        : `**Итог:** ${OUTCOME_LABELS[result.outcome as keyof typeof OUTCOME_LABELS]}`,
      result.artifact && !result.success ? `Предмет получен со статусом: ${ARTIFACT_STATUS_LABELS[result.artifact.status]}` : null,
      "-# Заготовка и материалы списаны из инвентаря персонажа.",
      `-# ${RUNE_PAD}`,
    ]);

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(back(characterId, "К артефактам")));

    return container;
  }

  public static artifactDetail(characterId: string, artifact: Artifact & { runes: (ArtifactRune & { rune: Rune })[]; recipe: { name: string } | null }) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${ARTIFACT_HEADER} ${artifact.name}`,
      `-# ${ARTIFACT_STATUS_LABELS[artifact.status]} · создан <t:${Math.floor(artifact.createdAt.getTime() / 1000)}:D>`,
      `> ${artifact.effect}`,
      "",
      `**Нагрузка / вместимость:** ${artifact.load} / ${artifact.capacity}`,
      `**Качество:** ${artifact.quality}/100`,
      `**Нанесённые руны:** ${artifact.runes.map((entry) => `${entry.rune.emoji} ${entry.rune.name}${entry.critical ? "*" : ""} (${entry.load})`).join(", ")}`,
      `-# ${RUNE_PAD}`,
    ]);

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(back(characterId)));

    return container;
  }
}

import { RollKind } from "../types/rolls.js";

export type SeedEntry = {
  kind: RollKind;
  name: string;
  description: string;
  emoji: string | null;
  imageUrl: string | null;
  chance: number;
  isDefault?: boolean;
};

export const ROLL_SEED: SeedEntry[] = [
  {
    kind: RollKind.RACE,
    name: "Человек",
    description: "Обычный человек, ничем не примечательный.",
    emoji: "<:726931good:1518587367110213642>",
    imageUrl:
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemNyMzk5eXgzcGZ5cmQzcXByd3VjOHd4d2w3cHppczRyN3Q5NGF3bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xUA7b7GQh38iuPTKBq/giphy.gif",
    chance: 0,
    isDefault: true,
  },
  {
    kind: RollKind.RACE,
    name: "Эльф",
    description:
      "Типичные слуги магического мира, являющиеся воплощением магии, но может вы способны на что-то большее, чем просто стать домохозяйкой?",
    emoji: "<:726931good:1518587367110213642>",
    imageUrl:
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExemh4aTl6NjYzYXkzZGpvbDBybWhzczh0ejY1Y3pzY281cjBqb25oMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/T1HNGhvx14iru/giphy.gif",
    chance: 400,
  },
  {
    kind: RollKind.RACE,
    name: "Великан",
    description: "Огромное существо, обладающее невероятной физической силой.",
    emoji: "<:726931good:1518587367110213642>",
    imageUrl: null,
    chance: 250,
  },
  {
    kind: RollKind.RACE,
    name: "Оборотень",
    description: "Существо, способное превращаться в волка. Опасно и непредсказуемо.",
    emoji: "<:113449afk:1518587342171017286>",
    imageUrl: null,
    chance: 150,
  },
  {
    kind: RollKind.RACE,
    name: "Вампир",
    description: "Древнее существо ночи, обладающее бессмертием и жаждой крови.",
    emoji: "<:79278boostblack:1518587309417697300>",
    imageUrl: null,
    chance: 75,
  },
  {
    kind: RollKind.TRAIT,
    name: "Без особенностей",
    description: "Магических особенностей не выявлено — обычный волшебник со своими силами.",
    emoji: "<:726931good:1518587367110213642>",
    imageUrl: null,
    chance: 0,
    isDefault: true,
  },
  {
    kind: RollKind.TRAIT,
    name: "Легилименция",
    description: "Врождённый талант проникать в чужое сознание, читать мысли и воспоминания.",
    emoji: "🧠",
    imageUrl: null,
    chance: 300,
  },
  {
    kind: RollKind.TRAIT,
    name: "Окклюменция",
    description: "Природная способность закрывать разум от чужого вторжения.",
    emoji: "🛡️",
    imageUrl: null,
    chance: 300,
  },
  {
    kind: RollKind.TRAIT,
    name: "Провидец",
    description: "Редкий дар видеть обрывки будущего и делать настоящие пророчества.",
    emoji: "🔮",
    imageUrl: null,
    chance: 200,
  },
  {
    kind: RollKind.TRAIT,
    name: "Врождённый анимаг",
    description: "Склонность к анимагии: превращение в животное даётся легче, чем другим.",
    emoji: "🐾",
    imageUrl: null,
    chance: 150,
  },
  {
    kind: RollKind.TRAIT,
    name: "Метаморфомаг",
    description: "Способность по желанию менять внешность без зелий и заклинаний.",
    emoji: "🎭",
    imageUrl: null,
    chance: 100,
  },
  {
    kind: RollKind.TRAIT,
    name: "Змееуст",
    description: "Редчайший дар понимать змей и говорить на парселтанге.",
    emoji: "🐍",
    imageUrl: null,
    chance: 50,
  },
];

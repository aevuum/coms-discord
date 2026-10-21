export enum RuneAlphabet {
  Elder = "elder",
  Younger = "younger",
}

export type Rune = {
  key: string;
  alphabet: RuneAlphabet;
  name: string;
  meaning: string;
  emoji: string;
};

export const RUNE_ALPHABETS: Record<RuneAlphabet, { label: string; description: string }> = {
  [RuneAlphabet.Elder]: {
    label: "Старший футарк",
    description: "Строгие и несгибаемые руны: каждая вырезается отдельно и делает одну фундаментальную вещь. Плохо сочетаются между собой, зато хороши для зачарования предметов.",
  },
  [RuneAlphabet.Younger]: {
    label: "Младший футарк",
    description: "Податливые и мягкие руны: в одной заключено несколько звуков и функций. Легко складываются в связки и даже в полноценные заклинания.",
  },
};

const elder = (key: string, name: string, meaning: string, id: string): Rune => ({
  key: `elder_${key}`,
  alphabet: RuneAlphabet.Elder,
  name,
  meaning,
  emoji: `<:elder_${key}:${id}>`,
});

const younger = (key: string, name: string, meaning: string, id: string): Rune => ({
  key: `younger_${key}`,
  alphabet: RuneAlphabet.Younger,
  name,
  meaning,
  emoji: `<:younger_${key}:${id}>`,
});

export const RUNES: Rune[] = [
  elder("fehu", "Феху", "богатство, скот", "1562468435043024927"),
  elder("uruz", "Уруз", "сила, тур", "1562468463585402960"),
  elder("thurisaz", "Турисаз", "великан, шип", "1562468458946633828"),
  elder("ansuz", "Ансуз", "бог, слово", "1562468430295334952"),
  elder("raido", "Райдо", "путь, странствие", "1562468454194216980"),
  elder("kenaz", "Кеназ", "факел, знание", "1562468447865016330"),
  elder("gebo", "Гебо", "дар, обмен", "1562468437736038482"),
  elder("wunjo", "Вуньо", "радость", "1562468465984413696"),
  elder("hagalaz", "Хагалаз", "град, разрушение", "1562468440260743209"),
  elder("nauthiz", "Наутиз", "нужда", "1562468450037665922"),
  elder("isa", "Иса", "лёд, неподвижность", "1562468442634715146"),
  elder("jera", "Йера", "урожай, цикл", "1562468445591699526"),
  elder("eihwaz", "Эйваз", "тис, стойкость", "1562468432220524687"),
  elder("perthro", "Перто", "тайна, жребий", "1562468452176887960"),
  elder("algiz", "Альгиз", "защита", "1562468427472306297"),
  elder("sowilo", "Совило", "солнце", "1562468456438177882"),
  elder("tiwaz", "Тейваз", "победа, честь", "1562468461366607902"),
  elder("berkano", "Беркана", "берёза, рост", "1562468374049718372"),
  elder("ehwaz", "Эваз", "конь, движение", "1562468379108057099"),
  elder("mannaz", "Манназ", "человек", "1562468386565259324"),
  elder("laguz", "Лагуз", "вода, поток", "1562468384401260625"),
  elder("ingwaz", "Ингуз", "плодородие", "1562468382085881956"),
  elder("dagaz", "Дагаз", "день, пробуждение", "1562468376692006962"),
  elder("othala", "Отала", "наследие, дом", "1562468388733845524"),
  younger("fe", "Фе", "богатство", "1562468395381825656"),
  younger("ur", "Ур", "морось, шлак", "1562468422833406042"),
  younger("thurs", "Турс", "великан", "1562468418182062120"),
  younger("oss", "Оусс", "бог, устье", "1562468411546804295"),
  younger("reid", "Рейд", "езда", "1562468414021439578"),
  younger("kaun", "Каун", "язва", "1562468401857822801"),
  younger("hagall", "Хагаль", "град", "1562468397709529188"),
  younger("naud", "Науд", "нужда", "1562468409265102950"),
  younger("iss", "Исс", "лёд", "1562468399693566012"),
  younger("ar", "Ар", "урожай, год", "1562468390977802320"),
  younger("sol", "Соль", "солнце", "1562468416047153234"),
  younger("tyr", "Тюр", "бог Тюр", "1562468420526804993"),
  younger("bjarkan", "Бьяркан", "берёза", "1562468393292931192"),
  younger("madr", "Мадр", "человек", "1562468406266036254"),
  younger("logr", "Лёгр", "вода", "1562468403938205726"),
  younger("yr", "Юр", "тис", "1562468425249595482"),
];

export const RUNE_MAX_PROGRESS = 100;

export function getRune(key: string) {
  return RUNES.find((rune) => rune.key === key) ?? null;
}

export function runesOf(alphabet: RuneAlphabet) {
  return RUNES.filter((rune) => rune.alphabet === alphabet);
}

export type HelpCategoryDefinition = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  modules: string[];
};

export type HelpCommandEntry = {
  name: string;
  mention: string;
  usage: string | null;
  description: string;
  categoryId: string;
};

export type HelpCategoryPage = {
  category: HelpCategoryDefinition;
  commands: HelpCommandEntry[];
};

export type HelpPage = {
  pages: HelpCategoryPage[];
  index: number;
  mask: string;
};

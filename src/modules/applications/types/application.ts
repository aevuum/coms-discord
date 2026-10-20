export class ApplicationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export type ApplicationQuestion = {
  title: string;
  hint: string | null;
  optional: boolean;
};

export type ApplicationAnswer = ApplicationQuestion & {
  answer: string | null;
};

export type ApplicationRole = {
  tagId: string;
  name: string;
  roleId: string | null;
  roleManual: boolean;
  open: boolean;
  customQuestions: boolean;
  emoji: { id: string; name: string } | { unicode: string } | null;
};

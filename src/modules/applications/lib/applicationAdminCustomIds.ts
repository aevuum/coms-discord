export enum ApplicationAdminAction {
  Root = "root",
  PickRole = "pick_role",
  Role = "role",
  Toggle = "toggle",
  Add = "add",
  AddModal = "add_modal",
  PickQuestion = "pick_question",
  Question = "question",
  Edit = "edit",
  EditModal = "edit_modal",
  Up = "up",
  Down = "down",
  Delete = "delete",
  Reset = "reset",
  RolePage = "role_page",
  RoleSet = "role_set",
  RoleAuto = "role_auto",
}

const PREFIX = "appadmin";

export class ApplicationAdminCustomIds {
  public static build(action: ApplicationAdminAction, ...args: (string | number)[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (
      prefix !== PREFIX ||
      !Object.values(ApplicationAdminAction).includes(action as ApplicationAdminAction)
    ) {
      return null;
    }

    return { action: action as ApplicationAdminAction, args };
  }
}

export enum ApplicationAdminFields {
  Title = "question_title",
  Hint = "question_hint",
  Optional = "question_optional",
}

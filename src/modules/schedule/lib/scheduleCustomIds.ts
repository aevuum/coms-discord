export enum ScheduleAction {
  Home = "home",
  Create = "create",
  CreateModal = "create_modal",
  Open = "open",
  Edit = "edit",
  EditModal = "edit_modal",
  Cancel = "cancel",
  CancelModal = "cancel_modal",
  Absent = "absent",
  GradePick = "grade_pick",
  GradeModal = "grade_modal",
  GradeDelete = "grade_delete",
}

export enum ScheduleAdminAction {
  Root = "root",
  Open = "open",
  Approve = "approve",
  Reject = "reject",
  RejectModal = "reject_modal",
  Cancel = "cancel",
  CancelModal = "cancel_modal",
  Subjects = "subjects",
  SubjectCreate = "subject_create",
  SubjectOpen = "subject_open",
  SubjectEdit = "subject_edit",
  SubjectModal = "subject_modal",
  SubjectToggle = "subject_toggle",
  Settings = "settings",
  SettingsModal = "settings_modal",
}

export enum LessonCardAction {
  Join = "join",
  Leave = "leave",
  Pick = "pick",
}

export enum GradesAction {
  Character = "c",
  Subject = "s",
  Month = "m",
}

export const REVIEW_FLAG = "r";

export const ScheduleFields = {
  Subject: "subject",
  Topic: "topic",
  StartsAt: "starts_at",
  Channel: "channel",
  Capacity: "capacity",
  Reason: "reason",
  Title: "title",
  WorkType: "work_type",
  Value: "value",
  Name: "name",
  Emoji: "emoji",
  Order: "order",
  ReviewChannel: "review_channel",
  ReminderMinutes: "reminder_minutes",
} as const;

const build = (prefix: string, action: string, args: (string | number)[]) => [prefix, action, ...args].join(":");

const parse = <T extends string>(prefix: string, actions: Record<string, T>, customId: string) => {
  const [head, action, ...args] = customId.split(":");

  if (head !== prefix || !Object.values(actions).includes(action as T)) {
    return null;
  }

  return { action: action as T, args };
};

export class ScheduleCustomIds {
  public static teacher(action: ScheduleAction, ...args: (string | number)[]) {
    return build("sched", action, args);
  }

  public static parseTeacher(customId: string) {
    return parse("sched", ScheduleAction, customId);
  }

  public static admin(action: ScheduleAdminAction, ...args: (string | number)[]) {
    return build("schedadm", action, args);
  }

  public static parseAdmin(customId: string) {
    return parse("schedadm", ScheduleAdminAction, customId);
  }

  public static card(action: LessonCardAction, ...args: (string | number)[]) {
    return build("lesson", action, args);
  }

  public static parseCard(customId: string) {
    return parse("lesson", LessonCardAction, customId);
  }

  public static grades(action: GradesAction, ...args: (string | number)[]) {
    return build("grades", action, args);
  }

  public static parseGrades(customId: string) {
    return parse("grades", GradesAction, customId);
  }
}

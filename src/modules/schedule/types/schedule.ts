import type {
  CharacterGrade,
  Lesson,
  LessonEnrollment,
  Subject,
} from "../../../database/generated/prisma/client.js";

export const SCHEDULE_COMMAND = "schedule";
export const SCHEDULE_TEACH_KEY = "schedule.teach";
export const SCHEDULE_MANAGE_KEY = "manage.schedule";

export const MAX_REMINDER_MINUTES = 120;
export const MIN_LEAD_MINUTES = 5;
export const MAX_AHEAD_DAYS = 180;
export const MAX_CAPACITY = 100;

export class ScheduleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ScheduleError";
  }
}

export type LessonWithSubject = Lesson & { subject: Subject };

export type EnrollmentWithCharacter = LessonEnrollment & {
  character: { id: string; rpName: string };
};

export type LessonDetails = LessonWithSubject & {
  enrollments: EnrollmentWithCharacter[];
  grades: (CharacterGrade & { character: { rpName: string } })[];
};

export type LessonDraft = {
  subjectId?: string;
  topic: string;
  startsAt: string;
  channelId: string | null;
  capacity: string;
};

export type GradeDraft = {
  title: string;
  workType: string;
  value: string;
};

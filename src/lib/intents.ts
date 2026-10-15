import { ApplicationFlags, REST, Routes } from "discord.js";

const MEMBER_INTENT_FLAGS =
  ApplicationFlags.GatewayGuildMembers |
  ApplicationFlags.GatewayGuildMembersLimited;

export async function hasGuildMembersIntent(token: string | undefined) {
  if (!token) {
    return false;
  }

  try {
    const application = (await new REST()
      .setToken(token)
      .get(Routes.currentApplication())) as { flags?: number };

    return ((application.flags ?? 0) & MEMBER_INTENT_FLAGS) !== 0;
  } catch {
    return false;
  }
}

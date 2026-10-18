import { setTimeout as sleep } from "node:timers/promises";

import prisma from "../database/prisma.js";

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 60;

export async function waitForDatabase() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }

      console.warn(`Database is not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}), retrying...`);

      await sleep(RETRY_DELAY_MS);
    }
  }
}

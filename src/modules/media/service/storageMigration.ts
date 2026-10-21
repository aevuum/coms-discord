import prisma from "../../../database/prisma.js";
import { Storage } from "../../../lib/storage.js";

export class StorageMigration {
  public static async run() {
    return {
      avatars: await this.avatars(),
      banners: await this.banners(),
      items: await this.items(),
      spells: await this.spells(),
      rolls: await this.rolls(),
    };
  }

  private static async spells() {
    const spells = await prisma.spell.findMany({
      where: { imagePath: null, imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });

    let moved = 0;

    for (const spell of spells) {
      const path = await Storage.uploadFromUrl(spell.imageUrl!).catch(() => null);

      if (path) {
        await prisma.spell.update({
          where: { id: spell.id },
          data: { imagePath: path, imageUrl: null },
        });

        moved++;
      }
    }

    return moved;
  }

  private static async rolls() {
    const entries = await prisma.rollEntry.findMany({
      where: { imagePath: null, imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });

    let moved = 0;

    for (const entry of entries) {
      const path = await Storage.uploadFromUrl(entry.imageUrl!).catch(() => null);

      if (path) {
        await prisma.rollEntry.update({
          where: { id: entry.id },
          data: { imagePath: path, imageUrl: null },
        });

        moved++;
      }
    }

    return moved;
  }

  private static async avatars() {
    const characters = await prisma.character.findMany({
      where: { avatarPath: null, avatarUrl: { not: null } },
      select: { id: true, avatarUrl: true },
    });

    let moved = 0;

    for (const character of characters) {
      const path = await Storage.uploadFromUrl(character.avatarUrl!).catch(() => null);

      if (path) {
        await prisma.character.update({
          where: { id: character.id },
          data: { avatarPath: path, avatarUrl: null },
        });

        moved++;
      }
    }

    return moved;
  }

  private static async banners() {
    const users = await prisma.user.findMany({
      where: { profileBannerPath: null, profileBannerUrl: { not: null } },
      select: { id: true, profileBannerUrl: true },
    });

    let moved = 0;

    for (const user of users) {
      const path = await Storage.uploadFromUrl(user.profileBannerUrl!).catch(() => null);

      if (path) {
        await prisma.user.update({
          where: { id: user.id },
          data: { profileBannerPath: path, profileBannerUrl: null },
        });

        moved++;
      }
    }

    return moved;
  }

  private static async items() {
    const items = await prisma.characterInventoryItem.findMany({
      where: { imagePath: null, imageData: { not: null } },
      select: { id: true, imageData: true, imageMime: true },
    });

    let moved = 0;

    for (const item of items) {
      const path = await Storage.uploadBuffer(item.imageData!, item.imageMime ?? "").catch(
        () => null,
      );

      if (path) {
        await prisma.characterInventoryItem.update({
          where: { id: item.id },
          data: { imagePath: path, imageData: null, imageMime: null },
        });

        moved++;
      }
    }

    return moved;
  }
}

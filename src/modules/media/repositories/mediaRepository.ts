import prisma from "../../../database/prisma.js";

export class MediaRepository {
  public static create(data: Uint8Array<ArrayBuffer>, mime: string) {
    return prisma.storedImage.create({ data: { data, mime } });
  }

  public static get(id: string) {
    return prisma.storedImage.findUnique({ where: { id } });
  }

  public static setLocation(id: string, messageId: string, url: string, urlExpiresAt: Date) {
    return prisma.storedImage.update({
      where: { id },
      data: { messageId, url, urlExpiresAt },
    });
  }

  public static listExpiring(before: Date) {
    return prisma.storedImage.findMany({
      where: { OR: [{ urlExpiresAt: null }, { urlExpiresAt: { lte: before } }] },
      select: { id: true },
    });
  }

  public static delete(id: string) {
    return prisma.storedImage.deleteMany({ where: { id } });
  }

  public static async applyUrl(id: string, url: string) {
    await prisma.$transaction([
      prisma.character.updateMany({ where: { avatarImageId: id }, data: { avatarUrl: url } }),
      prisma.user.updateMany({ where: { profileBannerImageId: id }, data: { profileBannerUrl: url } }),
    ]);
  }

  public static listLegacyAvatars() {
    return prisma.character.findMany({
      where: { avatarImageId: null, avatarUrl: { not: null } },
      select: { id: true, avatarUrl: true },
    });
  }

  public static listLegacyBanners() {
    return prisma.user.findMany({
      where: { profileBannerImageId: null, profileBannerUrl: { not: null } },
      select: { id: true, profileBannerUrl: true },
    });
  }

  public static setCharacterAvatar(characterId: string, imageId: string | null, url: string | null) {
    return prisma.character.update({
      where: { id: characterId },
      data: { avatarImageId: imageId, avatarUrl: url },
    });
  }

  public static setUserBanner(userId: string, imageId: string | null, url: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { profileBannerImageId: imageId, profileBannerUrl: url },
    });
  }
}

type CachedUsers = {
  expires: number;

  users: {
    id: string;
    discordId: string;

    characters: {
      id: string;
      rpName: string;
    }[];
  }[];
};

export class EconomyCache {
  private static users: CachedUsers | null = null;

  private static TTL = 60_000;

  public static getUsers() {
    if (!this.users) {
      return null;
    }

    if (Date.now() > this.users.expires) {
      this.users = null;
      return null;
    }

    return this.users.users;
  }

  public static setUsers(users: CachedUsers["users"]) {
    this.users = {
      expires: Date.now() + this.TTL,
      users,
    };
  }

  public static clear() {
    this.users = null;
  }
}

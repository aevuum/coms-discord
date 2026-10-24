export enum ArtifactAction {
  Pick = "pick",
  Back = "back",
  Home = "home",
  Artifact = "artifact",
  Recipe = "recipe",
  Extras = "extras",
  Craft = "craft",
}

export class ArtifactCustomIds {
  private static readonly PREFIX = "artifacts";

  public static build(action: ArtifactAction, ...args: (string | number)[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as ArtifactAction,
      args: parts.slice(2),
    };
  }
}

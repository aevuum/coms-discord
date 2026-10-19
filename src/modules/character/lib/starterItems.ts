export const STARTER_ITEMS = ["Волшебная палочка", "Одежда"];

export class StarterItems {
  public static records() {
    return STARTER_ITEMS.map((name) => ({
      name,
      nameKey: name.toLocaleLowerCase("ru"),
      quantity: 1,
    }));
  }
}

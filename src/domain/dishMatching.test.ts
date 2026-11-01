import { frameworks, products, recipes } from "@/domain/__fixtures__/catalog";
import type { DishMatch } from "./dishMatching";
import { matchDishes } from "./dishMatching";

const input = (available: string[]) => ({
  available: new Set(available),
  products,
  recipes: recipes.values(),
  frameworks: frameworks.values(),
});

const summary = (match: DishMatch) =>
  match.kind === "recipe"
    ? { title: match.recipe.title, missing: match.missingProductIds }
    : { title: match.framework.title, missing: match.missingSlotIds, choices: match.choices };

describe("matchDishes", () => {
  it("counts staples as available and ranks by what is missing, then by title", () => {
    const matches = matchDishes(input(["chicken", "broccoli", "rice"]));

    expect(matches.map(summary)).toEqual([
      { title: "Боул", missing: [], choices: { base: "base-rice", protein: "protein-chicken", veg: "veg-broccoli" } },
      { title: "Курка з броколі", missing: [] },
      { title: "Сочевичний суп", missing: ["lentils", "onion"] },
    ]);
  });

  it("drops dishes missing more than the limit", () => {
    const matches = matchDishes(input(["chicken", "broccoli", "rice"]), { maxMissing: 1 });

    expect(matches.map((match) => summary(match).title)).toEqual(["Боул", "Курка з броколі"]);
  });

  it("ignores optional slots and text options when judging a framework", () => {
    const [bowlMatch] = matchDishes(input(["rice", "salmon", "avocado"]), { maxMissing: 0 });

    expect(bowlMatch && summary(bowlMatch)).toEqual({
      title: "Боул",
      missing: [],
      choices: { base: "base-rice", protein: "protein-salmon", veg: "veg-avocado" },
    });
  });

  it("keeps only kid-friendly dishes when asked", () => {
    const matches = matchDishes(input(["lentils", "onion"]), { kidFriendlyOnly: true, maxMissing: 5 });

    expect(matches.map((match) => summary(match).title)).toEqual(["Сочевичний суп"]);
  });
});

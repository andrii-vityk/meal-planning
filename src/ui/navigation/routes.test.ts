import type { Route } from "./routes";
import { defaultRoute, formatRoute, parseRoute } from "./routes";

const examples: readonly [string, Route][] = [
  ["plan", { section: "plan" }],
  ["cook", { section: "cook" }],
  ["shopping", { section: "shopping" }],
  ["recipes", { section: "recipes", screen: { kind: "list" } }],
  ["recipe-new", { section: "recipes", screen: { kind: "create" } }],
  ["recipe-import", { section: "recipes", screen: { kind: "import" } }],
  [
    "recipe-3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c",
    { section: "recipes", screen: { kind: "detail", recipeId: "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c" } },
  ],
  [
    "recipe-3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c-edit",
    { section: "recipes", screen: { kind: "edit", recipeId: "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c" } },
  ],
  ["pantry", { section: "pantry", screen: { kind: "tab", tab: "products" } }],
  ["pantry-frameworks", { section: "pantry", screen: { kind: "tab", tab: "frameworks" } }],
  ["pantry-data", { section: "pantry", screen: { kind: "tab", tab: "data" } }],
  ["framework-new", { section: "pantry", screen: { kind: "frameworkEdit" } }],
  ["framework-bowl-edit", { section: "pantry", screen: { kind: "frameworkEdit", frameworkId: "bowl" } }],
];

describe("routes", () => {
  it.each(examples)("reads and writes %s", (address, route) => {
    expect(parseRoute(address)).toEqual(route);
    expect(parseRoute(`#${address}`)).toEqual(route);
    expect(formatRoute(route)).toBe(address);
  });

  it("opens the plan for an empty or unknown address", () => {
    expect(parseRoute("")).toEqual(defaultRoute);
    expect(parseRoute("recipes/123")).toEqual(defaultRoute);
    expect(parseRoute("framework-")).toEqual(defaultRoute);
    expect(defaultRoute).toEqual({ section: "plan" });
  });

  it("accepts ids written outside the app", () => {
    expect(parseRoute("recipe-chicken_teriyaki")).toEqual({
      section: "recipes",
      screen: { kind: "detail", recipeId: "chicken_teriyaki" },
    });
  });
});

import type { Route } from "./routes";
import { defaultRoute, dishRoute, formatRoute, parseRoute } from "./routes";

const uuid = "3f2a9c1e-7b4d-4e8a-9c21-5d6e7f8a9b0c";

const examples: readonly [string, Route][] = [
  ["plan", { section: "plan" }],
  ["cook", { section: "cook" }],
  ["shopping", { section: "shopping" }],
  ["products", { section: "products" }],
  ["backup", { section: "backup" }],
  ["dishes", dishRoute({ kind: "list" })],
  ["recipe-new", dishRoute({ kind: "recipeNew" })],
  ["recipe-import", dishRoute({ kind: "recipeImport" })],
  [`recipe-${uuid}`, dishRoute({ kind: "recipe", recipeId: uuid })],
  [`recipe-${uuid}-edit`, dishRoute({ kind: "recipeEdit", recipeId: uuid })],
  ["framework-new", dishRoute({ kind: "frameworkNew" })],
  [`framework-${uuid}`, dishRoute({ kind: "framework", frameworkId: uuid })],
  ["framework-bowl-edit", dishRoute({ kind: "frameworkEdit", frameworkId: "bowl" })],
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
    expect(parseRoute("recipe-chicken_teriyaki")).toEqual(dishRoute({ kind: "recipe", recipeId: "chicken_teriyaki" }));
  });

  it("keeps addresses of earlier versions working", () => {
    expect(parseRoute("recipes")).toEqual(dishRoute({ kind: "list" }));
    expect(parseRoute("pantry")).toEqual({ section: "products" });
    expect(parseRoute("pantry-frameworks")).toEqual(dishRoute({ kind: "list" }));
    expect(parseRoute("pantry-data")).toEqual({ section: "backup" });
  });
});

/**
 * Every screen of the app as a value, and its address in the URL hash.
 *
 * The artifact host passes only a plain `#name` (ASCII letters, digits,
 * hyphens) between the page and its link, so a screen and its parameters
 * are encoded into one such name: `recipe-<id>-edit`, not `recipes/<id>/edit`.
 * Parsing and formatting are pure functions, tested without a browser.
 */

export const sections = ["plan", "cook", "shopping", "dishes", "products", "backup"] as const;
export type Section = (typeof sections)[number];

/** Sections in the main navigation; the rest are reached from elsewhere. */
export const navigationSections = ["plan", "cook", "shopping", "dishes", "products"] as const satisfies readonly Section[];

export type DishScreen =
  | { readonly kind: "list" }
  | { readonly kind: "recipe"; readonly recipeId: string }
  | { readonly kind: "recipeEdit"; readonly recipeId: string }
  | { readonly kind: "recipeNew" }
  | { readonly kind: "recipeImport" }
  | { readonly kind: "framework"; readonly frameworkId: string }
  | { readonly kind: "frameworkEdit"; readonly frameworkId: string }
  | { readonly kind: "frameworkNew" };

export type Route =
  | { readonly section: "plan" | "cook" | "shopping" | "products" | "backup" }
  | { readonly section: "dishes"; readonly screen: DishScreen };

export const dishRoute = (screen: DishScreen): Route => ({ section: "dishes", screen });

/** The first screen of each section. */
export function sectionRoot(section: Section): Route {
  return section === "dishes" ? dishRoute({ kind: "list" }) : { section };
}

export const defaultRoute: Route = sectionRoot("plan");

const id = "([A-Za-z0-9_-]+?)";
const recipeAddress = new RegExp(`^recipe-${id}(-edit)?$`);
const frameworkAddress = new RegExp(`^framework-${id}(-edit)?$`);

/** Addresses from earlier versions of the app, so saved links keep working. */
const legacyAddresses: Readonly<Record<string, Route>> = {
  recipes: dishRoute({ kind: "list" }),
  pantry: { section: "products" },
  "pantry-frameworks": dishRoute({ kind: "list" }),
  "pantry-data": { section: "backup" },
};

function isSection(value: string): value is Section {
  return (sections as readonly string[]).includes(value);
}

/** Unknown or empty addresses open the default screen instead of failing. */
export function parseRoute(hash: string): Route {
  const name = hash.startsWith("#") ? hash.slice(1) : hash;

  if (isSection(name)) return sectionRoot(name);
  const legacy = legacyAddresses[name];
  if (legacy) return legacy;
  if (name === "recipe-new") return dishRoute({ kind: "recipeNew" });
  if (name === "recipe-import") return dishRoute({ kind: "recipeImport" });
  if (name === "framework-new") return dishRoute({ kind: "frameworkNew" });

  const recipe = recipeAddress.exec(name);
  if (recipe?.[1]) {
    const recipeId = recipe[1];
    return dishRoute(recipe[2] ? { kind: "recipeEdit", recipeId } : { kind: "recipe", recipeId });
  }

  const framework = frameworkAddress.exec(name);
  if (framework?.[1]) {
    const frameworkId = framework[1];
    return dishRoute(framework[2] ? { kind: "frameworkEdit", frameworkId } : { kind: "framework", frameworkId });
  }

  return defaultRoute;
}

function formatDishScreen(screen: DishScreen): string {
  switch (screen.kind) {
    case "list":
      return "dishes";
    case "recipe":
      return `recipe-${screen.recipeId}`;
    case "recipeEdit":
      return `recipe-${screen.recipeId}-edit`;
    case "recipeNew":
      return "recipe-new";
    case "recipeImport":
      return "recipe-import";
    case "framework":
      return `framework-${screen.frameworkId}`;
    case "frameworkEdit":
      return `framework-${screen.frameworkId}-edit`;
    case "frameworkNew":
      return "framework-new";
  }
}

/** The inverse of parseRoute: `parseRoute(formatRoute(route))` equals `route`. */
export function formatRoute(route: Route): string {
  return route.section === "dishes" ? formatDishScreen(route.screen) : route.section;
}

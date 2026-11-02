/**
 * Every screen of the app as a value, and its address in the URL hash.
 *
 * The artifact host passes only a plain `#name` (ASCII letters, digits,
 * hyphens) between the page and its link, so a screen and its parameters
 * are encoded into one such name: `recipe-<id>-edit`, not `recipes/<id>/edit`.
 * Parsing and formatting are pure functions, tested without a browser.
 */

export const sections = ["plan", "cook", "shopping", "recipes", "pantry"] as const;
export type Section = (typeof sections)[number];

export const pantryTabs = ["products", "frameworks", "data"] as const;
export type PantryTab = (typeof pantryTabs)[number];

export type RecipeScreen =
  | { readonly kind: "list" }
  | { readonly kind: "detail"; readonly recipeId: string }
  | { readonly kind: "edit"; readonly recipeId: string }
  | { readonly kind: "create" }
  | { readonly kind: "import" };

export type PantryScreen =
  | { readonly kind: "tab"; readonly tab: PantryTab }
  | { readonly kind: "frameworkEdit"; readonly frameworkId?: string };

export type Route =
  | { readonly section: "plan" }
  | { readonly section: "cook" }
  | { readonly section: "shopping" }
  | { readonly section: "recipes"; readonly screen: RecipeScreen }
  | { readonly section: "pantry"; readonly screen: PantryScreen };

/** The first screen of each section. */
export function sectionRoot(section: Section): Route {
  switch (section) {
    case "plan":
    case "cook":
    case "shopping":
      return { section };
    case "recipes":
      return { section, screen: { kind: "list" } };
    case "pantry":
      return { section, screen: { kind: "tab", tab: "products" } };
  }
}

export const defaultRoute: Route = sectionRoot("plan");

const recipeAddress = /^recipe-([A-Za-z0-9_-]+?)(-edit)?$/;
const frameworkAddress = /^framework-([A-Za-z0-9_-]+?)-edit$/;
const pantryTabAddress = /^pantry-(frameworks|data)$/;

function isSection(value: string): value is Section {
  return (sections as readonly string[]).includes(value);
}

/** Unknown or empty addresses open the default screen instead of failing. */
export function parseRoute(hash: string): Route {
  const name = hash.startsWith("#") ? hash.slice(1) : hash;

  if (isSection(name)) return sectionRoot(name);
  if (name === "recipe-new") return { section: "recipes", screen: { kind: "create" } };
  if (name === "recipe-import") return { section: "recipes", screen: { kind: "import" } };
  if (name === "framework-new") return { section: "pantry", screen: { kind: "frameworkEdit" } };

  const tab = pantryTabAddress.exec(name)?.[1];
  if (tab === "frameworks" || tab === "data") return { section: "pantry", screen: { kind: "tab", tab } };

  const recipe = recipeAddress.exec(name);
  if (recipe?.[1]) {
    const recipeId = recipe[1];
    return { section: "recipes", screen: recipe[2] ? { kind: "edit", recipeId } : { kind: "detail", recipeId } };
  }

  const frameworkId = frameworkAddress.exec(name)?.[1];
  if (frameworkId) return { section: "pantry", screen: { kind: "frameworkEdit", frameworkId } };

  return defaultRoute;
}

function formatRecipeScreen(screen: RecipeScreen): string {
  switch (screen.kind) {
    case "list":
      return "recipes";
    case "detail":
      return `recipe-${screen.recipeId}`;
    case "edit":
      return `recipe-${screen.recipeId}-edit`;
    case "create":
      return "recipe-new";
    case "import":
      return "recipe-import";
  }
}

function formatPantryScreen(screen: PantryScreen): string {
  if (screen.kind === "frameworkEdit") {
    return screen.frameworkId ? `framework-${screen.frameworkId}-edit` : "framework-new";
  }
  return screen.tab === "products" ? "pantry" : `pantry-${screen.tab}`;
}

/** The inverse of parseRoute: `parseRoute(formatRoute(route))` equals `route`. */
export function formatRoute(route: Route): string {
  switch (route.section) {
    case "plan":
    case "cook":
    case "shopping":
      return route.section;
    case "recipes":
      return formatRecipeScreen(route.screen);
    case "pantry":
      return formatPantryScreen(route.screen);
  }
}

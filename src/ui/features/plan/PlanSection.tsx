import { Activity, useState } from "react";
import { startOfWeek } from "@/domain/calendar";
import { dayMenu } from "@/domain/weekPlanning";
import { todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { goBack, navigate } from "@/ui/navigation/router";
import type { PlanScreen } from "@/ui/navigation/routes";
import { planRoute } from "@/ui/navigation/routes";
import { strings } from "@/ui/strings/uk";
import { PlanView } from "./PlanView";
import { TodayView } from "./TodayView";
import styles from "./plan.module.css";

/**
 * The plan section: today's meals or the whole week.
 *
 * Whether the first screen shows today is decided once, when the screen is
 * opened and the plan has loaded. Otherwise adding a dish for today in the
 * week view would swap the screen under the user's finger.
 */
export function PlanSection({ screen }: { screen: PlanScreen }) {
  const dependencies = useDependencies();
  const snapshot = useCollection(dependencies.planEntries);

  const today = todayIso();
  const weekStart = startOfWeek(today);
  const todayMeals = dayMenu(
    [...snapshot.items.values()].filter((entry) => entry.weekStart === weekStart),
    today,
  );
  const hasToday = todayMeals.length > 0;
  const isLoaded = snapshot.status !== "loading" || snapshot.items.size > 0;

  // Derived state updated during render ("storing information from previous
  // renders"): the decision is remembered per opening of the screen.
  const [opened, setOpened] = useState<{ screen: PlanScreen; showsToday: boolean } | null>(null);
  if (isLoaded && opened?.screen !== screen) {
    setOpened({ screen, showsToday: screen === "today" && hasToday });
  }
  const showsToday = screen === "today" && (opened?.screen === screen ? opened.showsToday : hasToday);

  return (
    <>
      {showsToday && <TodayView date={today} meals={todayMeals} onWholeWeek={() => navigate(planRoute("week"))} />}
      {/* The week keeps its state (chosen week, an unsaved draft) while today is shown. */}
      <Activity mode={showsToday ? "hidden" : "visible"}>
        {screen === "week" && hasToday && (
          <div>
            <button
              type="button"
              className={`button button-secondary ${styles.backToToday}`}
              onClick={() => goBack(planRoute("today"))}
            >
              {strings.today.backToToday}
            </button>
          </div>
        )}
        <PlanView />
      </Activity>
    </>
  );
}

import { useState } from "react";
import type { AiLogEntry } from "@/application/ports/aiLog";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./data.module.css";

const shown = 30;

const time = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} с`;

function flags(entry: AiLogEntry): string[] {
  const result: string[] = [];
  if (entry.hiddenDuring) result.push(entry.hiddenAtEnd ? strings.aiLog.hiddenAtEnd : strings.aiLog.hiddenDuring);
  if (!entry.online) result.push(strings.aiLog.offline);
  return result;
}

/** One line per request, in a form that can be pasted into a chat. */
function asText(entries: readonly AiLogEntry[]): string {
  return entries
    .map((entry) =>
      [
        entry.startedAt,
        entry.operation,
        `${entry.durationMs}ms`,
        entry.outcome === "ok" ? "ok" : `${entry.errorCode ?? "error"}${entry.detail ? ` (${entry.detail})` : ""}`,
        `hidden:${entry.hiddenAtStart ? "start," : ""}${entry.hiddenDuring ? "during," : ""}${entry.hiddenAtEnd ? "end" : ""}`,
        entry.online ? "online" : "offline",
        entry.mobile ? "mobile" : "desktop",
      ].join(" | "),
    )
    .join("\n");
}

/** Recent AI requests with their outcome, for finding out why some fail. */
export function AiLogPanel() {
  const { aiLog } = useDependencies();
  const snapshot = useCollection(aiLog);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const entries = [...snapshot.items.values()].toSorted((a, b) => b.startedAt.localeCompare(a.startedAt));
  const failures = entries.filter((entry) => entry.outcome === "error").length;

  const copy = () => {
    // Called inside the click handler: browsers allow clipboard writes only there.
    navigator.clipboard.writeText(asText(entries)).then(
      () => setMessage(strings.aiLog.copied),
      () => setMessage(strings.aiLog.copyFailed),
    );
  };

  const clear = async () => {
    setConfirmingClear(false);
    try {
      await Promise.all(entries.map((entry) => aiLog.remove(entry.id)));
      setMessage(strings.aiLog.cleared);
    } catch {
      setMessage(strings.common.unexpectedError);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="ai-log-heading">
      <h2 id="ai-log-heading" className={styles.heading}>
        {strings.aiLog.heading}
      </h2>
      <p className="hint">{strings.aiLog.intro}</p>

      {entries.length === 0 ? (
        <p className="hint">{snapshot.status === "loading" ? strings.data.loading : strings.aiLog.empty}</p>
      ) : (
        <>
          <p>{strings.aiLog.summary(entries.length, failures)}</p>
          <ol className={styles.log}>
            {entries.slice(0, shown).map((entry) => (
              <li key={entry.id} className={entry.outcome === "error" ? `${styles.logRow} ${styles.logError}` : styles.logRow}>
                <span className={styles.logTime}>{time.format(new Date(entry.startedAt))}</span>
                <span>{strings.aiLog.operations[entry.operation]}</span>
                <span className={styles.logTime}>{seconds(entry.durationMs)}</span>
                <span>
                  {entry.outcome === "ok"
                    ? strings.aiLog.ok
                    : `${entry.errorCode ? strings.aiLog.codes[entry.errorCode] : strings.aiLog.error}${entry.detail ? ` · ${entry.detail}` : ""}`}
                  {flags(entry).map((flag) => (
                    <span key={flag} className={styles.logFlag}>
                      {" "}
                      · {flag}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button type="button" className="button button-secondary" onClick={copy}>
              {strings.aiLog.copy}
            </button>
            {confirmingClear ? (
              <>
                <button type="button" className="button button-danger" onClick={() => void clear()}>
                  {strings.aiLog.confirmClear}
                </button>
                <button type="button" className="button button-secondary" onClick={() => setConfirmingClear(false)}>
                  {strings.common.cancel}
                </button>
              </>
            ) : (
              <button type="button" className="button button-secondary" onClick={() => setConfirmingClear(true)}>
                {strings.aiLog.clear}
              </button>
            )}
          </div>
        </>
      )}
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

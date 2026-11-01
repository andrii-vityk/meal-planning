import { useState, useTransition } from "react";
import { exportBackup, importBackup } from "@/application/backup";
import { BackupFormatError } from "@/application/ports/backup";
import { todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { strings } from "@/ui/strings/uk";
import styles from "./data.module.css";

type Message = { readonly kind: "info" | "error"; readonly text: string } | null;

export function DataPanel() {
  const dependencies = useDependencies();
  const [message, setMessage] = useState<Message>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isBusy, startWork] = useTransition();

  const runExport = () => {
    setMessage(null);
    startWork(async () => {
      const saved = await exportBackup(dependencies, todayIso());
      setMessage({ kind: "info", text: saved ? strings.backup.exported : strings.backup.exportDeclined });
    });
  };

  const runImport = (file: File) => {
    setMessage(null);
    startWork(async () => {
      try {
        const summary = await importBackup(dependencies, await file.text());
        setMessage({ kind: "info", text: strings.backup.imported(summary.records) });
      } catch (error) {
        setMessage({
          kind: "error",
          text: error instanceof BackupFormatError ? strings.backup.importFailed : strings.common.unexpectedError,
        });
      } finally {
        setPendingFile(null);
      }
    });
  };

  return (
    <section className={styles.section} aria-labelledby="backup-heading">
      <h2 id="backup-heading" className={styles.heading}>
        {strings.backup.heading}
      </h2>
      <p className="hint">{strings.backup.intro}</p>

      <div>
        {dependencies.files.canSave ? (
          <button type="button" className="button" onClick={runExport} disabled={isBusy}>
            {strings.backup.export}
          </button>
        ) : (
          <p className="hint">{strings.backup.exportUnavailable}</p>
        )}
      </div>

      <label className="field">
        <span className="label">{strings.backup.importLabel}</span>
        <input
          id="backup-import-file"
          type="file"
          accept="application/json,.json"
          disabled={isBusy}
          onChange={(event) => {
            setMessage(null);
            setPendingFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </label>

      {pendingFile && (
        <div className={styles.confirm}>
          <p>{strings.backup.importQuestion(pendingFile.name)}</p>
          <div className={styles.actions}>
            <button type="button" className="button" onClick={() => runImport(pendingFile)} disabled={isBusy}>
              {strings.backup.import}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setPendingFile(null)}>
              {strings.common.cancel}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.kind === "error" ? "error" : "hint"} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </section>
  );
}

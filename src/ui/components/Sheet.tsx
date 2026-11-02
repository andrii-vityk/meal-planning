import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { strings } from "@/ui/strings/uk";
import styles from "./Sheet.module.css";

interface SheetProps {
  /** id of the heading inside, which names the dialog. */
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A modal panel: from the bottom edge on phones, centred on wider screens.
 * Escape, a tap outside and the close button all call onClose.
 */
export function Sheet({ labelledBy, onClose, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Moving focus into the panel is a side effect on the DOM, so it belongs
  // in an effect: keyboard and screen-reader users land inside the dialog.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={styles.panel}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button type="button" className={styles.close} aria-label={strings.common.close} onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

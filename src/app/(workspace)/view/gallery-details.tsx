"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveGalleryDetails, type GalleryDetailsState, type GalleryTable } from "./actions";

type Props = { table?: GalleryTable; id: string; date: string | null; comment: string | null };

const initial: GalleryDetailsState = { status: "idle" };

// "2026-11-13" → "13/11/2026"
function toDisplay(iso: string | null) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

// Keeps digits only and puts the slashes in as they're typed: "13112026" → "13/11/2026".
function maskDate(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

// Date and comment shown under the photo in the public gallery, as terminal-style key/value rows.
// Each field saves itself when it loses focus (or on Enter in the date), so there's no button.
export function GalleryDetails({ table = "files", id, date, comment }: Props) {
  const [state, action, pending] = useActionState(saveGalleryDetails.bind(null, table, id), initial);
  const [dateValue, setDateValue] = useState(toDisplay(date));
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialValues = { date: toDisplay(date), comment: comment ?? "" };
  const saved = useRef(initialValues);
  // Last values the server confirmed; a failed save rolls `saved` back so it can be retried.
  const confirmed = useRef(initialValues);
  const attempted = useRef(initialValues);

  useEffect(() => {
    if (state.status === "saved") confirmed.current = attempted.current;
    else if (state.status === "error") saved.current = confirmed.current;
  }, [state]);

  function saveIfChanged() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const next = {
      date: String(data.get("gallery_date") ?? "").trim(),
      comment: String(data.get("gallery_comment") ?? "").trim(),
    };
    if (next.date && next.date.length < 10) {
      setLocalError("data incompleta. use dd/mm/aaaa.");
      return;
    }
    setLocalError(null);
    if (next.date === saved.current.date && next.comment === saved.current.comment) return;
    saved.current = next;
    attempted.current = next;
    form.requestSubmit();
  }

  const status = pending
    ? "salvando…"
    : localError ?? (state.status === "error" ? state.message : state.status === "saved" ? "salvo." : "");
  const isError = !pending && (localError !== null || state.status === "error");

  return (
    <form ref={formRef} action={action} className="gallery-details">
      <label htmlFor="gallery-date">data</label>
      <input
        id="gallery-date"
        name="gallery_date"
        className="cli-input is-date"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={dateValue}
        onChange={(event) => setDateValue(maskDate(event.target.value))}
        onBlur={saveIfChanged}
        onKeyDown={(event) => {
          // Enter goes through the same check as leaving the field, not straight to submit.
          if (event.key !== "Enter") return;
          event.preventDefault();
          saveIfChanged();
        }}
        aria-invalid={localError !== null || undefined}
        aria-describedby="gallery-details-status"
      />

      <label htmlFor="gallery-comment">comentário</label>
      <textarea
        id="gallery-comment"
        name="gallery_comment"
        className="cli-input"
        rows={1}
        maxLength={1000}
        placeholder="sem comentário"
        defaultValue={comment ?? ""}
        onBlur={saveIfChanged}
        aria-describedby="gallery-details-status"
      />

      <p
        id="gallery-details-status"
        className={`gallery-details-status${isError ? " is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </form>
  );
}

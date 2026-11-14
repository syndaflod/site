"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addTrack, type AddTrackState } from "../view/actions";

const initial: AddTrackState = { status: "idle" };

// Under the dropzone on /drop: paste a Spotify song link, Enter adds it to /gallery.
// autoDate is the dropzone's "data de hoje" option, so songs and files follow one switch.
export function AddTrack({ autoDate }: { autoDate: boolean }) {
  const [value, setValue] = useState("");
  const [state, action, pending] = useActionState(async (previous: AddTrackState, data: FormData) => {
    const next = await addTrack(previous, data);
    // Clear only once the song is in; on an error the link stays to be fixed. Controlled, so
    // React's automatic form reset after the action doesn't wipe it either.
    if (next.status === "added") setValue("");
    return next;
  }, initial);

  const status = pending ? "buscando no spotify…" : state.message ?? "";

  return (
    <form action={action} className="add-track">
      <label htmlFor="spotify-link">♪ música</label>
      <input
        id="spotify-link"
        name="spotify_link"
        className="cli-input"
        // Plain text, not type="url": the browser's own URL check would block the server's
        // clearer message, and spotify:track: links aren't web URLs.
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="cole o link do spotify e aperte enter"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        // readOnly, not disabled: a disabled field loses focus, so the next link couldn't be
        // pasted straight away.
        readOnly={pending}
        aria-busy={pending || undefined}
        aria-invalid={(!pending && state.status === "error") || undefined}
        aria-describedby="add-track-status"
      />
      <p
        id="add-track-status"
        className={`gallery-details-status${state.status === "error" && !pending ? " is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
        {!pending && state.status === "added" && state.id && (
          <>
            {" · "}
            <Link href={`/view/musica/${state.id}`}>abrir</Link>
          </>
        )}
      </p>
      {autoDate && <input type="hidden" name="auto_date" value="on" />}
    </form>
  );
}

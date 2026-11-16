"use client";

import { useActionState, useEffect, useState } from "react";
import { createShare, revokeShare, type CreateShareState } from "../actions";
import { ActionButton } from "./action-button";
import { formatDate } from "@/lib/format";

export type Share = { id: string; token: string; expires_at: string | null };

const DURATIONS = [
  { value: "2h", label: "2 horas" },
  { value: "1d", label: "1 dia" },
  { value: "1w", label: "1 semana" },
  { value: "1m", label: "1 mês" },
  { value: "forever", label: "sem prazo" },
] as const;

const shareUrl = (token: string) => `${window.location.origin}/s/${token}`;

/** Copies the link; returns false where the clipboard is blocked (it's still shown to copy by hand). */
async function copy(token: string) {
  try {
    await navigator.clipboard.writeText(shareUrl(token));
    return true;
  } catch {
    return false;
  }
}

/**
 * "links públicos" on /view/[id]: makes a link that shows this one file to anyone who has it, for
 * the chosen time, without putting it in /gallery. A new link is copied right away; the active
 * ones are listed under it, each with copy and revoke.
 */
export function ShareLinks({ fileId, shares }: { fileId: string; shares: Share[] }) {
  const [state, action, pending] = useActionState<CreateShareState, FormData>(
    createShare.bind(null, fileId),
    { status: "idle" },
  );
  const [copied, setCopied] = useState<string | null>(null);

  // A new link goes straight to the clipboard.
  useEffect(() => {
    if (state.status !== "created" || !state.token) return;
    const token = state.token;
    void copy(token).then((ok) => setCopied(ok ? token : null));
  }, [state]);

  const copyAgain = async (token: string) => setCopied((await copy(token)) ? token : null);

  return (
    <section className="share-links" aria-label="links públicos">
      <form action={action} className="action-group">
        <label htmlFor="share-duration">link público por</label>
        <select id="share-duration" name="duration" defaultValue="1d" className="cli-select">
          {DURATIONS.map((duration) => (
            <option key={duration.value} value={duration.value}>
              {duration.label}
            </option>
          ))}
        </select>
        <button type="submit" className="cli-button" disabled={pending} aria-busy={pending || undefined}>
          criar link
        </button>
      </form>

      <p className={`share-status${state.status === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
        {state.status === "error"
          ? state.message
          : state.status === "created"
            ? state.token === copied
              ? "link copiado. só quem tiver o link vê o arquivo."
              : "link criado. use “copiar” na lista para copiá-lo."
            : ""}
      </p>

      {shares.length > 0 && (
        <ul className="share-list">
          {shares.map((share) => (
            <li key={share.id} className="share-item">
              {/* Shortened on screen; the full link is the href, and "copiar" copies all of it. */}
              <a className="share-url" href={`/s/${share.token}`} target="_blank" rel="noreferrer">
                /s/{share.token}
              </a>
              <span className="share-expiry cli-dim">
                {share.expires_at ? (
                  <>
                    até <time dateTime={share.expires_at}>{formatDate(share.expires_at)}</time>
                  </>
                ) : (
                  "sem prazo"
                )}
              </span>
              <span className="share-actions">
                <button type="button" className="text-button" onClick={() => void copyAgain(share.token)}>
                  {copied === share.token ? "copiado" : "copiar"}
                </button>
                <ActionButton action={revokeShare.bind(null, fileId, share.id)} className="text-button is-danger">
                  revogar
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

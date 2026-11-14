"use client";

import { useState } from "react";

/**
 * "data de hoje" checkbox, checked by default: placed inside a form that adds something to
 * /gallery, it makes the server action set today's date (São Paulo) unless one is already set.
 * Unchecked, the item goes in without a date. Controlled, so React's automatic form reset
 * after the action doesn't tick it again between songs; it lasts for that page view.
 */
export function TodayOption() {
  const [checked, setChecked] = useState(true);
  return (
    <label className="drop-option today-option">
      <input
        type="checkbox"
        name="auto_date"
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
      />
      <span>data de hoje</span>
    </label>
  );
}

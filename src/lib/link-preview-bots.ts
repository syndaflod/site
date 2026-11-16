import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

// Apps that fetch a link to draw its preview card (Discord, WhatsApp, Telegram, ...). Next's own
// list of crawlers that need <head> complete before they read it, plus a few it leaves out.
// next.config.ts passes this as htmlLimitedBots, so every bot that /s/[token] serves its card
// page to also gets blocking metadata: the tags land in <head>, where these crawlers look.
export const LINK_PREVIEW_BOTS = new RegExp(
  `${HTML_LIMITED_BOT_UA_RE.source}|TelegramBot|Embedly|Iframely|Mastodon|Bluesky`,
  "i",
);

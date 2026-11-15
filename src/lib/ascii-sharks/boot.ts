// Standalone entry, compiled to public/ocean/ by `npm run build:ocean` and loaded
// as a module script from the root layout. It starts the background as soon as the
// HTML is parsed instead of waiting for React to download and hydrate.
import { OceanEngine } from "./engine.js";

const canvas = document.querySelector<HTMLCanvasElement>("canvas.site-ascii-ocean");
if (canvas) new OceanEngine(canvas);

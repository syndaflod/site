import Link from "next/link";

const art = [
  " ███▄    █  ▒█████  ▄▄▄█████▓     █████▒▒█████   █    ██  ███▄    █ ▓█████▄ ",
  " ██ ▀█   █ ▒██▒  ██▒▓  ██▒ ▓▒   ▓██   ▒▒██▒  ██▒ ██  ▓██▒ ██ ▀█   █ ▒██▀ ██▌",
  "▓██  ▀█ ██▒▒██░  ██▒▒ ▓██░ ▒░   ▒████ ░▒██░  ██▒▓██  ▒██░▓██  ▀█ ██▒░██   █▌",
  "▓██▒  ▐▌██▒▒██   ██░░ ▓██▓ ░    ░▓█▒  ░▒██   ██░▓▓█  ░██░▓██▒  ▐▌██▒░▓█▄   ▌",
  "▒██░   ▓██░░ ████▓▒░  ▒██▒ ░    ░▒█░   ░ ████▓▒░▒▒█████▓ ▒██░   ▓██░░▒████▓ ",
  "░ ▒░   ▒ ▒ ░ ▒░▒░▒░   ▒ ░░       ▒ ░   ░ ▒░▒░▒░ ░▒▓▒ ▒ ▒ ░ ▒░   ▒ ▒  ▒▒▓  ▒ ",
  "░ ░░   ░ ▒░  ░ ▒ ▒░     ░        ░       ░ ▒ ▒░ ░░▒░ ░ ░ ░ ░░   ░ ▒░ ░ ▒  ▒ ",
  "   ░   ░ ░ ░ ░ ░ ▒    ░          ░ ░   ░ ░ ░ ▒   ░░░ ░ ░    ░   ░ ░  ░ ░  ░ ",
  "         ░     ░ ░                         ░ ░     ░              ░    ░    ",
  "                                                                     ░      ",
].join("\n");

export default function NotFound() {
  return (
    <main className="cli-root">
      <div
        className="cli-col"
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <pre
          className="cli-banner cli-acc"
          role="img"
          aria-label="not found"
          // 76 columns at a 0.56em advance (0.6em glyph, -0.04em spacing) must fit
          // inside the 1rem side gutters.
          style={{ margin: "0 0 2rem", fontSize: "clamp(4px, calc((100vw - 2rem) / 44), 14px)", textAlign: "left" }}
        >
          {art}
        </pre>
        <h1 className="cli-acc cli-b" style={{ margin: 0, fontSize: "inherit" }}>
          página não encontrada
        </h1>
        <p className="cli-dim">a página que você procurou mudou de lugar ou nunca existiu.</p>
        <p style={{ marginTop: "1.5rem" }}>
          <span className="cli-acc" aria-hidden="true">
            &gt;{" "}
          </span>
          <Link href="/">voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}

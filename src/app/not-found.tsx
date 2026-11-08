import Link from "next/link";
import { TitleBanner } from "./title-banner";
import { notFoundBanner } from "./title-banners";

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
        <TitleBanner art={notFoundBanner} className="title-banner-404" label="404" />
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

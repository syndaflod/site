import Link from "next/link";
import { TitleBanner } from "./title-banner";
import { notFoundBanner } from "./title-banners";
import { Mark } from "./mark";

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
        <p style={{ marginTop: "1.5rem" }}>
          <Mark />{" "}
          <Link href="/">voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}

import { connection } from "next/server";
import { FavoriteFilmsSection } from "./favorite-films-section";
import PortfolioClient from "./portfolio-client";

export default async function Home() {
  await connection();
  return <PortfolioClient favoriteFilms={<FavoriteFilmsSection />} />;
}

import "./landing.css";
import { LandingNavbar } from "./Navbar";
import { Hero } from "./Hero";
import { ShowcaseVideo } from "./ShowcaseVideo";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Footer } from "./Footer";
import { FurnitureMarquee } from "./FurnitureMarquee";

interface LandingPageProps {
  isLoggedIn?: boolean;
}

export default function LandingPage({ isLoggedIn = false }: LandingPageProps) {
  return (
    <div className="landing-root">
      <LandingNavbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <ShowcaseVideo />
      <Features />
      <FurnitureMarquee />
      <HowItWorks />
      <Footer />
    </div>
  );
}

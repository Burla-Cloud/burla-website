import { Nav } from "./components/Nav";
import { Descent, DaySky } from "./components/Sky";
import { HeroAct } from "./sections/HeroAct";
import { What } from "./sections/What";
import { Examples } from "./sections/Examples";
import { Features } from "./sections/Features";
import { Faq } from "./sections/Faq";
import { Finale } from "./sections/Finale";

export default function App() {
  return (
    <div className="grain bg-void text-ink">
      <Nav />
      <main>
        <HeroAct />
        <Descent />
        {/* Everything below the clouds lives in daylight. */}
        <div data-day-zone className="theme-day relative text-ink">
          <DaySky />
          <div className="relative">
            <What />
            <Examples />
            <Features />
            <Faq />
            <Finale />
          </div>
        </div>
      </main>
    </div>
  );
}

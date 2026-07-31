import { Nav } from "./components/Nav";
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
        <What />
        <Examples />
        <Features />
        <Faq />
        <Finale />
      </main>
    </div>
  );
}

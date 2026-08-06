import { Nav } from "./components/Nav";
import { StarfieldBackground } from "./components/StarfieldBackground";
import { HeroAct } from "./sections/HeroAct";
import { What } from "./sections/What";
import { Workloads } from "./sections/Workloads";
import { Laptop } from "./sections/Laptop";
import { Features } from "./sections/Features";
import { Finale } from "./sections/Finale";

export default function App() {
  return (
    <div className="grain relative bg-void text-ink">
      {/* One continuous scene behind the entire page. */}
      <StarfieldBackground galaxy />
      <Nav />
      <main className="relative z-10">
        <HeroAct />
        <What />
        <Laptop />
        <Features />
        <Workloads />
        <Finale />
      </main>
    </div>
  );
}

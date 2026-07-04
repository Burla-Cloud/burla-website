import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Solution } from "./sections/Solution";
import { MentalModel } from "./sections/MentalModel";
import { DeployScale } from "./sections/DeployScale";
import { DynamicSizing } from "./sections/DynamicSizing";
import { WorkloadCompare } from "./sections/WorkloadCompare";
import { SystemPrompt } from "./sections/SystemPrompt";
import { FAQ } from "./sections/FAQ";
import { FinalCTA } from "./sections/FinalCTA";
import { Footer } from "./sections/Footer";

export default function App() {
  return (
    <>
      <Nav />
      <main className="bg-onyx text-ink">
        <Hero />
        <Problem />
        <Solution />
        <MentalModel />
        <DeployScale />
        <DynamicSizing />
        <WorkloadCompare />
        <SystemPrompt />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

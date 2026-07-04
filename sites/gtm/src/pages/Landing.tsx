import { Nav } from "../sections/Nav";
import { Hero } from "../sections/Hero";
import { Problem } from "../sections/Problem";
import { ScaleAnyWorkload } from "../sections/ScaleAnyWorkload";
import { LessCompute } from "../sections/LessCompute";
import { HowItWorks } from "../sections/HowItWorks";
import { ManageAtScale } from "../sections/ManageAtScale";
import { PilotProcess } from "../sections/PilotProcess";
import { Pricing } from "../sections/Pricing";
import { Footer } from "../sections/Footer";

export function Landing() {
  return (
    <>
      <Nav />
      <main className="bg-onyx text-ink">
        <Hero />
        <Problem />
        <ScaleAnyWorkload />
        <LessCompute />
        <HowItWorks />
        <ManageAtScale />
        <PilotProcess />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}

import { MotionConfig } from "motion/react";
import LandingNavbar from "@/components/nav/LandingNavbar";
import { Hero } from "@/components/Landing/Hero";
import { AgentDemo } from "@/components/Landing/AgentDemo";
import { AppsBloom } from "@/components/Landing/AppsBloom";
import { WorkflowVine } from "@/components/Landing/WorkflowVine";
import { Permissions } from "@/components/Landing/Permissions";
import { Pricing } from "@/components/Landing/Pricing";
import { Footer } from "@/components/Landing/Footer";

/*
  The argument, one claim per section:
  hero          what GoPilot is: your Google apps in one chat
  how           ask once and the right agents answer (a request plays out live)
  apps          six apps, each with its own agents and its own flower
  workflows     build a workflow once and let it run, with a say where you want one
  permissions   you choose what each agent may touch
  pricing       start free
*/
function Landingpage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh scroll-smooth bg-paper text-ink">
        <LandingNavbar />
        <main>
          <Hero />
          <AgentDemo />
          <AppsBloom />
          <WorkflowVine />
          <Permissions />
          <Pricing />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

export default Landingpage;

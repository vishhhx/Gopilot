import Container from "../../components/Landing/Container";
import LandingNavbar from "../../components/nav/LandingNavbar";
import HeroSection from "../../components/Landing/HeroSection";
import { motion } from "motion/react";


function Landingpage() {
  return (
    <div className="bg-gray-100 dark:bg-black ">
      <motion.div
        className="absolute bg-black z-[999] w-full h-full pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{
          duration: 2,
          ease: "easeInOut",
        }}
      />

      <Container className="z-99">
        <LandingNavbar />
        <HeroSection />
      </Container>
     
    </div>
  );
}

export default Landingpage;

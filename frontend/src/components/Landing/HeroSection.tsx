import { useEffect } from "react";
import { FaLongArrowAltRight } from "react-icons/fa";

import { motion, stagger, useAnimate } from "framer-motion";
import { BackgroundRippleEffect } from "../ui/background-ripple-effect";

import { TracingBeamFeatures } from "./TracingBeamFeatures";
import PricingCards from "./PricingCards";
import { MacbookScroll } from "../ui/macbook-scroll";
import pajju from "../../assets/pajju.png";
function HeroSection() {
  const text = "Your AI Copilot for Gmail, Drive & Calendar";
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animateText();
  }, []);

  function animateText() {
    animate(
      ".t1",
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
      },
      {
        duration: 0.3,
        delay: stagger(0.04),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Background ripple effect */}
      <BackgroundRippleEffect cellSize={60} rows={10} />

      {/* Top CTA */}
      <div className="flex justify-center mt-10">
        <div className="flex justify-center items-center mt-40">
          <div className="flex items-center dark:bg-black/50 bg-white/10 dark:text-neutral-100 py-1 px-3 rounded-xl backdrop-blur-lg hover:bg-[#e2e8f0] border border-[#94a3b8] gap-2 cursor-pointer transition">
            <p className="font-inter text-[13px] font-semibold">
              Get started with your Google Workspace
            </p>
            <FaLongArrowAltRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Animated heading */}
      <div
        className="mt-10 flex flex-col items-center gap-3 space-y-4"
        ref={scope}
      >
        <motion.p className="w-[60rem] text-6xl text-center font-semibold dark:text-neutral-200 mask-r-from-65% to-0%">
          {text.split("").map((letter, idx) => (
            <motion.span
              key={idx}
              className="t1"
              initial={{ opacity: 0, y: 100, filter: "blur(50px)" }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.p>

        <p className="dark:text-neutral-400 w-[40rem] text-center text-neutral-700">
          GoPilot brings Gmail, Drive, and Calendar together into one powerful
          AI assistant. Search faster, summarize instantly, schedule meetings,
          and manage your entire workflow through a single intelligent chat.
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-10 flex gap-3 justify-center z-60">
        <button className="py-2 px-3 text-neutral-100 bg-neutral-950 dark:bg-neutral-100 rounded-xl dark:text-black hover:scale-110 transition duration-300">
          Start Free
        </button>
        <button className="py-2 px-3 text-neutral-950 dark:text-neutral-100 rounded-xl hover:scale-110 transition duration-300">
          Explore Features
        </button>
      </div>

      {/* Hero image */}
      {/* <div className="mx-auto mt-10">
        <motion.img
          initial={{ y: 150 }}
          animate={{ y: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          src={heroImg}
          alt="GoPilot illustration"
          className="shadow-md mask-b-from-10% to-100%"
        />
      </div> */}

      <div className="mt-80">
        <TracingBeamFeatures />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 mt-20">
        <h2 className="text-4xl font-bold text-center mb-6">
          Choose Your GoPolit
        </h2>
        <PricingCards />
      </div>

      <div>
        <MacbookScroll src={pajju} title="Made with Love by Vish " />
      </div>
    </div>
  );
}

export default HeroSection;

import Logo from "./Logo";
import { Link } from "react-router-dom";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
interface NavItem {
  name: string;
  href: string;
}

function LandingNavbar() {
  const { authData, isAuthenticated } = useAppSelector((state) => state.auth);
  console.log(authData);
  const navElements: NavItem[] = [
    { name: "How it works", href: "#" },
    { name: "Benefits", href: "#" },
    { name: "Features", href: "#" },
    { name: "Pricing", href: "#" },
    { name: "Testimonials", href: "#" },
  ];

  const ref = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const { scrollY } = useScroll({
    target: ref,
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const newChange = latest / 100;
    setScrolled(newChange > 2);
  });

  return (
    <motion.div
      className=" fixed top-0 mx-auto -right-0 -left-0 z-50   p-3 flex justify-between items-center gap-20 dark:text-neutral-100 backdrop-blur-lg transition-all duration-300  "
      initial={{ opacity: 1, filter: "blur(10px)" }}
      animate={{ opacity: [0, 0.5, 1], filter: "blur(0px)" }}
      transition={{
        duration: 0.3,
        ease: [0.33, 1, 0.68, 1],
        delay: 0.3,
      }}
      ref={ref}
      style={{
        width: scrolled ? "70rem" : "80rem",
        borderRadius: scrolled ? "25px" : "0px",
        boxShadow: scrolled
          ? "inset 0 0 10px rgba(20, 255, 255, 0.2)"
          : "inset 0 0 0 rgba(0, 0, 0, 0)",
        marginTop: scrolled ? "20px" : "0px",
      }}
    >
      <Logo />
      <div className="flex text-sm gap-6">
        {navElements.map((item, idx) => (
          <Link
            key={idx}
            to={item.href}
            className="hover:text-neutral-600 hover:dark:text-neutral-400 cursor-pointer"
          >
            {item.name}
          </Link>
        ))}
      </div>

      {isAuthenticated ? (
        <div className="flex flex-row-reverse gap-3 items-center cursor-pointer">
          <Link
            to="/dashboard"
            className="py-2 px-3 bg-neutral-950 dark:bg-neutral-100 rounded-xl dark:text-black text-neutral-100 hover:-translate-y-1 transition duration-300"
          >
            Get Started
          </Link>
          <div>
            <img
              src={authData?.avatarUrl}
              alt=""
              className="rounded-full size-10 border-1  border-white"
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2 text-sm">
          <Link
            to="/login"
            className="px-4 py-1.5 hover:backdrop-blur-2xl hover:bg-neutral-600/40 rounded-xl transition-all duration-300"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-3 py-1.5 bg-black rounded-xl dark:bg-neutral-600/40 dark:hover:bg-neutral-600/10 text-neutral-100 shadow-[inset_0_0_30px_rgba(0,255,255,0.)] border-[0.5px] border-neutral-200 transition duration-300"
          >
            Sign Up
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export default LandingNavbar;

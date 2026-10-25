import { Fragment, type ReactNode } from "react";
import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Rises and fades in the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A headline whose words rise one after another. */
export function RiseWords({
  text,
  delay = 0,
  step = 0.07,
  className,
  inView = false,
}: {
  text: string;
  delay?: number;
  step?: number;
  className?: string;
  /** wait until scrolled into view instead of playing on load */
  inView?: boolean;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "105%", opacity: 0 }}
              {...(inView
                ? { whileInView: { y: 0, opacity: 1 }, viewport: { once: true } }
                : { animate: { y: 0, opacity: 1 } })}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * step }}
            >
              {w}
            </motion.span>
          </span>
          {/* the space lives outside the clipped box, or it collapses */}
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </span>
  );
}

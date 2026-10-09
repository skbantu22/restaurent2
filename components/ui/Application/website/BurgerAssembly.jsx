"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Hero burger that builds itself: the bottom bun rises in, then each
// layer drops from above and lands on the stack, then the finished
// burger gently floats. The layers are horizontal slices of
// /assets/Burgers.png (public/assets/burger-layers/*.webp) with
// feathered cut edges, so once stacked they look identical to the
// original photo. top/height are percentages of that 1024x1024 image.
const LAYERS = [
  { src: "bun-bottom", top: 62.5, height: 37.5 },
  { src: "patty-bottom", top: 51.27, height: 13.184 },
  { src: "patty-top", top: 42.48, height: 10.742 },
  { src: "toppings", top: 33.203, height: 11.23 },
  { src: "bun-top", top: 0, height: 35.156 },
];

const DROP_GAP = 0.38; // seconds between each layer landing
const ASSEMBLE_TIME = (LAYERS.length - 1) * DROP_GAP + 0.9;

export default function BurgerAssembly({ className = "" }) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [assembled, setAssembled] = useState(false);

  // Start only once every layer has downloaded, so no piece pops in
  // mid-fall. Fallback timer in case a load event is missed (cache).
  useEffect(() => {
    if (loaded >= LAYERS.length) setReady(true);
  }, [loaded]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setAssembled(true), ASSEMBLE_TIME * 1000);
    return () => clearTimeout(t);
  }, [ready]);

  const still = reduceMotion;

  return (
    <motion.div
      className={`relative aspect-square ${className}`}
      animate={
        !still && assembled
          ? { y: [0, -14, 0], rotate: [-1, 1, -1] }
          : { y: 0, rotate: 0 }
      }
      transition={
        assembled
          ? { duration: 5, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0 }
      }
      role="img"
      aria-label="London's Finest Smash Burger"
    >
      {LAYERS.map((layer, i) => {
        const isBase = i === 0;
        const hidden = isBase
          ? { opacity: 0, y: 40, scale: 0.96 }
          : { opacity: 0, y: -260 - i * 40 };
        const shown = { opacity: 1, y: 0, scale: 1 };

        return (
          <motion.img
            key={layer.src}
            src={`/assets/burger-layers/${layer.src}.webp`}
            alt=""
            draggable={false}
            onLoad={() => setLoaded((n) => n + 1)}
            initial={still ? shown : hidden}
            animate={still || ready ? shown : hidden}
            transition={
              isBase
                ? { duration: 0.6, ease: "easeOut" }
                : {
                    type: "spring",
                    stiffness: 260,
                    damping: 17,
                    mass: 0.9,
                    delay: i * DROP_GAP,
                    opacity: { duration: 0.2, delay: i * DROP_GAP },
                  }
            }
            className="absolute left-0 w-full select-none pointer-events-none"
            style={{ top: `${layer.top}%`, height: `${layer.height}%` }}
          />
        );
      })}
    </motion.div>
  );
}

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// GSAP is imported only from campus code, so the main marketplace build never ships it.
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP };

/** Animations only run for people who haven't asked the OS to reduce motion. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Fade-and-rise each `[data-reveal]` element inside `scope` the first time it
 * scrolls into view; elements entering together are staggered. Re-runs when
 * `dependencies` change (e.g. after data loads and new cards render).
 */
export const useReveal = (scope: RefObject<HTMLElement>, dependencies: unknown[] = []) =>
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]", scope.current);
        if (targets.length === 0) return;
        gsap.set(targets, { autoAlpha: 0, y: 24 });
        ScrollTrigger.batch(targets, {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, overwrite: true }),
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies, revertOnUpdate: true }
  );

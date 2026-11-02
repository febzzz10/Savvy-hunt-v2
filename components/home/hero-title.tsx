"use client";

import { useSyncExternalStore } from "react";
import GradientText from "../gradient-text";

const mobileQuery = "(max-width: 767px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

export function HeroTitle() {
  const mobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const title = <><span>Savvy</span><span>Hunt</span></>;
  if (!mobile) return title;
  return <GradientText className="festival-title-gradient"
    colors={["#1f2a23", "#32643b", "#c59439", "#32643b"]}
    animationSpeed={8} variant="flow" glow={0.12} scale={3}
    showBorder={false} pauseOnHover={false} followPointer={false}
  >{title}</GradientText>;
}

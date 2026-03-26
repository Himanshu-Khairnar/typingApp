"use client";
import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  decimals = 0,
  className,
  style,
}: AnimatedCounterProps) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) =>
    latest.toFixed(decimals)
  );
  const prevValue = useRef(0);

  useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;

    const controls = animate(motionVal, value, {
      duration,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [value, duration, motionVal]);

  return (
    <motion.span className={className} style={style}>
      {rounded}
    </motion.span>
  );
}

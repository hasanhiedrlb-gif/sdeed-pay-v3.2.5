'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1200,
  decimals = 2,
  prefix = '$',
  suffix = '',
  className = '',
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevValueRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;

    if (startVal === endVal) {
      return;
    }

    setDirection(endVal > startVal ? 'up' : 'down');
    setIsChanging(true);

    const startTime = performance.now();

    // Smooth ease-out exponential easing curve for financial counters
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const currentNumber = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(currentNumber);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
        setTimeout(() => {
          setIsChanging(false);
          setDirection(null);
        }, 600);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  // Keep prevValue in sync if component initially mounted
  useEffect(() => {
    prevValueRef.current = value;
  }, []);

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      className={`inline-flex items-center transition-all duration-300 ${
        isChanging
          ? direction === 'up'
            ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] scale-[1.03]'
            : 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-[1.03]'
          : ''
      } ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default CountUp;

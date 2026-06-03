import { useLayoutEffect, useRef } from "react";

interface ProgressFillProps {
  progress: number;
  className?: string;
}

/**
 * Renders a progress bar fill div whose width is set imperatively via a ref,
 * avoiding the need for a `style` prop on the JSX element.
 * This is required because Tailwind JIT cannot generate dynamic `w-[X%]` classes at build time.
 */
export function ProgressFill({ progress, className = "" }: ProgressFillProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${progress}%`;
    }
  }, [progress]);

  return <div ref={ref} className={className} />;
}

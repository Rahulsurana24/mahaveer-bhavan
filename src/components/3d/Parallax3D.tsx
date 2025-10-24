import { motion, useScroll, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface Parallax3DProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const Parallax3D = ({
  children,
  className = '',
  speed = 0.5,
  direction = 'up'
}: Parallax3DProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const directionMultiplier = direction === 'down' || direction === 'right' ? 1 : -1;
  const isHorizontal = direction === 'left' || direction === 'right';

  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    isHorizontal
      ? [0, directionMultiplier * 100 * speed]
      : [0, directionMultiplier * 100 * speed]
  );

  return (
    <motion.div
      ref={ref}
      style={isHorizontal ? { x: transform } : { y: transform }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

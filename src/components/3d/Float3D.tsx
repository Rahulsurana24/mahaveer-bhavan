import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Float3DProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  yOffset?: number;
  delay?: number;
}

export const Float3D = ({
  children,
  className = '',
  duration = 3,
  yOffset = 20,
  delay = 0
}: Float3DProps) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-yOffset, yOffset, -yOffset],
        rotateZ: [-2, 2, -2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  );
};

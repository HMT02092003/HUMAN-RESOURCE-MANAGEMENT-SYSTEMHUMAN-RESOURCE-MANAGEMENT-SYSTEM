"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({ 
  children, 
  className = "", 
  hoverEffect = false 
}: GlassCardProps) => {
  const baseClasses = `
    relative backdrop-blur-lg bg-white/80 
    rounded-2xl shadow-lg border border-white/20
    transition-all duration-300
    ${className}
  `;

  if (hoverEffect) {
    return (
      <motion.div
        className={baseClasses}
        whileHover={{ 
          y: -5, 
          boxShadow: "0px 20px 40px rgba(0,0,0,0.12)" 
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
};

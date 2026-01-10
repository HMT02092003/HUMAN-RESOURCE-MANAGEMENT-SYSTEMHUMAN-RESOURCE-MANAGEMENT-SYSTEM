"use client";

import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const statusStyles = {
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-300",
  danger: "bg-red-100 text-red-700 border-red-300",
  info: "bg-blue-100 text-blue-700 border-blue-300",
};

const sizeStyles = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
  lg: "text-base px-4 py-2",
};

export const StatusBadge = ({ 
  status, 
  label, 
  size = 'md', 
  animated = false 
}: StatusBadgeProps) => {
  const badgeClasses = `
    inline-flex items-center rounded-full border font-medium
    ${statusStyles[status]} ${sizeStyles[size]}
  `;

  if (animated) {
    return (
      <motion.span
        className={badgeClasses}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <span className={`w-2 h-2 rounded-full mr-2 ${status === 'success' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : status === 'danger' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></span>
        {label}
      </motion.span>
    );
  }

  return (
    <span className={badgeClasses}>
      {label}
    </span>
  );
};

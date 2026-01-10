"use client";

import { motion } from "framer-motion";

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'circle' | 'chart';
  count?: number;
}

export const LoadingSkeleton = ({ type = 'card', count = 3 }: LoadingSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white/50 rounded-2xl p-5 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="mt-4 h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        );
      
      case 'circle':
        return (
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className="bg-white/50 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </motion.div>
  );
};

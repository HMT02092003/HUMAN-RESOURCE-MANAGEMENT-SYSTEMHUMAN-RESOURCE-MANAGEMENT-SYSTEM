"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";
import { ArrowUp, ArrowDown, Users, Clock, FileWarning, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";

// Map icon string từ API sang Component Icon
const IconMap: Record<string, any> = {
  users: Users,
  clock: Clock,
  files: FileWarning,
  check: CheckCircle,
  x: XCircle,
  alert: AlertCircle,
  trending: TrendingUp,
};

interface StatWidgetProps {
  title: string;
  value: number;
  unit: string;
  trend?: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  iconKey: string;
  index: number;
}

const colorMap = {
  success: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
    iconBg: "bg-green-100",
  },
  warning: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
  },
  danger: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    iconBg: "bg-red-100",
  },
  info: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
  },
};

export const StatWidget = ({ 
  title, 
  value, 
  unit, 
  trend, 
  status, 
  iconKey, 
  index 
}: StatWidgetProps) => {
  const IconComponent = IconMap[iconKey] || Users;
  const colors = colorMap[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ 
        y: -8, 
        boxShadow: "0px 20px 40px rgba(0,0,0,0.12)",
        scale: 1.02
      }}
      className={`p-6 rounded-2xl border-l-4 bg-white shadow-md hover:shadow-xl transition-all duration-300 ${colors.border}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium mb-2">{title}</p>
          <div className="flex items-baseline">
            <motion.span 
              className="text-4xl font-bold text-gray-800"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
            >
              <CountUp end={value} duration={2.5} />
            </motion.span>
            <span className="ml-2 text-sm text-gray-400 font-medium">{unit}</span>
          </div>
        </div>
        
        <motion.div 
          className={`p-3 rounded-xl ${colors.iconBg}`}
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          <IconComponent className={colors.text} size={24} />
        </motion.div>
      </div>
      
      {/* Trend Indicator */}
      {trend && (
        <motion.div 
          className="mt-4 flex items-center text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.4 }}
        >
          {trend.includes("+") ? (
            <ArrowUp size={14} className="text-green-500 mr-1" />
          ) : trend.includes("-") ? (
            <ArrowDown size={14} className="text-red-500 mr-1" />
          ) : null}
          <span className={`font-medium ${trend.includes("+") ? "text-green-600" : trend.includes("-") ? "text-red-600" : "text-gray-600"}`}>
            {trend}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

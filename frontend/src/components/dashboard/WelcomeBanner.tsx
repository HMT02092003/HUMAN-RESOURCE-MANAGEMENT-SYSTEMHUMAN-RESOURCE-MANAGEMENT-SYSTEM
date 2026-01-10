"use client";

import { motion } from "framer-motion";
import { Sparkles, Calendar, Bell, FileText, Users } from "lucide-react";

interface QuickAction {
  icon: any;
  label: string;
  onClick: () => void;
  color: string;
}

interface WelcomeBannerProps {
  userName?: string;
  role?: string;
  quickActions?: QuickAction[];
}

const defaultQuickActions = [
  { icon: Calendar, label: "Xem lịch", onClick: () => {}, color: "from-blue-400 to-blue-600" },
  { icon: FileText, label: "Tạo đơn", onClick: () => {}, color: "from-green-400 to-green-600" },
  { icon: Bell, label: "Thông báo", onClick: () => {}, color: "from-yellow-400 to-yellow-600" },
  { icon: Users, label: "Nhân sự", onClick: () => {}, color: "from-purple-400 to-purple-600" },
];

export const WelcomeBanner = ({ 
  userName = "Admin", 
  role = "Quản trị viên",
  quickActions = defaultQuickActions 
}: WelcomeBannerProps) => {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Chào buổi sáng" : currentHour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-8 mb-8 shadow-2xl"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.div 
              className="flex items-center space-x-2 mb-2"
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="text-yellow-300" size={24} />
              <h1 className="text-3xl font-bold text-white">
                {greeting}, {userName}!
              </h1>
            </motion.div>
            <motion.p 
              className="text-white/80 text-sm"
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {role} • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </motion.p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.onClick}
                className={`flex items-center space-x-2 bg-white/20 backdrop-blur-lg text-white px-4 py-2.5 rounded-xl font-medium shadow-lg hover:bg-white/30 transition-all`}
              >
                <Icon size={18} />
                <span className="text-sm">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

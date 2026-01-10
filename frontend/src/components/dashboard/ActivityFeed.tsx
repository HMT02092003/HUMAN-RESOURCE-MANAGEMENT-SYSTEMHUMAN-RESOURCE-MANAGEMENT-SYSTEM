"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, User } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";

interface Activity {
  id: number;
  user: string;
  action: string;
  time: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  avatar?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

const defaultActivities: Activity[] = [
  { id: 1, user: "Nguyễn Văn A", action: "Đã check-in lúc 08:00", time: "5 phút trước", type: "success" },
  { id: 2, user: "Trần Thị B", action: "Gửi đơn xin nghỉ phép", time: "15 phút trước", type: "info" },
  { id: 3, user: "Lê Văn C", action: "Check-in muộn 30 phút", time: "30 phút trước", type: "warning" },
  { id: 4, user: "Phạm Thị D", action: "Đã hoàn thành task #123", time: "1 giờ trước", type: "success" },
  { id: 5, user: "Hoàng Văn E", action: "Vắng mặt không phép", time: "2 giờ trước", type: "danger" },
  { id: 6, user: "Đặng Thị F", action: "Gửi đơn xin tăng ca", time: "3 giờ trước", type: "info" },
  { id: 7, user: "Võ Văn G", action: "Check-out sớm 15 phút", time: "4 giờ trước", type: "warning" },
];

export const ActivityFeed = ({ activities = defaultActivities }: ActivityFeedProps) => {
  return (
    <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            {/* Avatar */}
            <motion.div 
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {activity.avatar ? (
                <img src={activity.avatar} alt={activity.user} className="w-full h-full rounded-full" />
              ) : (
                <User size={20} />
              )}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                {activity.user}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{activity.action}</p>
              
              <div className="flex items-center mt-2 space-x-2">
                <Clock size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">{activity.time}</span>
                <StatusBadge status={activity.type} size="sm" />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

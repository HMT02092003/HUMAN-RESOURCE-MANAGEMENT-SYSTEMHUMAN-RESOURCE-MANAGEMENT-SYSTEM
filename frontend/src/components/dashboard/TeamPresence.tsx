"use client";

import { motion } from "framer-motion";
import { User, CheckCircle, XCircle, Clock } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
}

interface TeamPresenceProps {
  members?: TeamMember[];
}

const defaultMembers: TeamMember[] = [
  { id: 1, name: "Nguyễn Văn A", status: "present", checkInTime: "08:00" },
  { id: 2, name: "Trần Thị B", status: "present", checkInTime: "08:15" },
  { id: 3, name: "Lê Văn C", status: "late", checkInTime: "09:30" },
  { id: 4, name: "Phạm Thị D", status: "absent" },
  { id: 5, name: "Hoàng Văn E", status: "present", checkInTime: "07:45" },
  { id: 6, name: "Đặng Thị F", status: "present", checkInTime: "08:30" },
  { id: 7, name: "Võ Văn G", status: "late", checkInTime: "09:00" },
  { id: 8, name: "Bùi Thị H", status: "absent" },
];

const statusConfig = {
  present: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Có mặt" },
  absent: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Vắng" },
  late: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50", label: "Muộn" },
};

export const TeamPresence = ({ members = defaultMembers }: TeamPresenceProps) => {
  const presentCount = members.filter(m => m.status === 'present').length;
  const lateCount = members.filter(m => m.status === 'late').length;
  const absentCount = members.filter(m => m.status === 'absent').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="h-full"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          <p className="text-xs text-green-700 font-medium">Có mặt</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
          <p className="text-xs text-yellow-700 font-medium">Đi muộn</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-red-700 font-medium">Vắng mặt</p>
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {members.map((member, index) => {
          const StatusIcon = statusConfig[member.status].icon;
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-xl ${statusConfig[member.status].bg} hover:shadow-md transition-all cursor-pointer group`}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  {/* Status Indicator Dot */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    member.status === 'present' ? 'bg-green-500' : 
                    member.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>

                {/* Info */}
                <div>
                  <p className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                    {member.name}
                  </p>
                  {member.checkInTime && (
                    <p className="text-xs text-gray-500">Check-in: {member.checkInTime}</p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-1">
                <StatusIcon className={statusConfig[member.status].color} size={16} />
                <span className={`text-xs font-medium ${statusConfig[member.status].color}`}>
                  {statusConfig[member.status].label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

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
    </motion.div>
  );
};

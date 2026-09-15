"use client";

import { getCharacterProfile } from '../lib/characters';

interface TeacherHeaderProps {
  avatarName?: string;
  teacherName?: string;
  topic?: string;
  className?: string;
}

export default function TeacherHeader({ avatarName = "luna", className = "" }: TeacherHeaderProps) {
  const profile = getCharacterProfile(avatarName);
  const displayName = profile.name.replace(/^(Instructor|Mentor|Professor)\s+/i, '');

  return (
    <div className={`pointer-events-none min-w-0 ${className}`}>
      <div className="bg-black/65 backdrop-blur-xl px-2 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl flex items-center gap-1.5 sm:gap-3 truncate max-w-full">
        <div className="w-6 h-6 sm:w-9 sm:h-9 shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xs sm:text-base font-bold shadow-inner text-white">
          <span>{profile.avatar}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="hidden sm:inline-block text-[8px] sm:text-[11px] text-purple-200 font-bold tracking-wider uppercase truncate">{profile.role}</span>
          <span className="text-xs sm:text-sm font-bold text-white truncate">
            <span className="sm:hidden">{displayName}</span>
            <span className="hidden sm:inline">{profile.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

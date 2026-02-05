import React from 'react';
import { UserData } from '../types';
import { GROUP_METADATA, getBadgeStyle, MBTI_TITLES, BADGE_WIDTH_MM, BADGE_HEIGHT_MM } from '../constants';

interface BadgeProps {
  user: UserData;
  scale?: number;
}

const Badge: React.FC<BadgeProps> = ({ user, scale = 1 }) => {
  const meta = GROUP_METADATA[user.mbtiGroup];
  const style = getBadgeStyle(user.mbtiGroup, user.mbtiSelection.ei);
  const Icon = meta.icon;

  // Fallback if some selection is missing (should verify in form, but safe for render)
  const mbtiFull = `${user.mbtiSelection.ei || '?'}${user.mbtiSelection.ns || '?'}${user.mbtiSelection.ft || '?'}${user.mbtiSelection.jp || '?'}`;
  const mbtiTitle = MBTI_TITLES[mbtiFull] || '';

  return (
    <div
      className="relative overflow-hidden shadow-2xl text-white font-sans shrink-0 box-border antialiased"
      style={{
        width: `${BADGE_WIDTH_MM}mm`,
        height: `${BADGE_HEIGHT_MM}mm`,
        background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Background Layers */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-100 z-0`} />
      
      {/* Large Watermark Text - Fixed Position */}
      <div className="absolute bottom-[-15px] left-0 right-0 flex justify-center opacity-10 font-black text-[180px] leading-none select-none z-0 tracking-tighter pointer-events-none">
        {user.mbtiGroup}
      </div>
      
      {/* Border Overlay */}
      <div className="absolute top-0 left-0 w-full h-full border-[6px] border-white/10 z-10 pointer-events-none" />

      {/* Main Content Container - Using Flex Column with Justify Between for better vertical spacing */}
      <div className="relative z-20 flex flex-col w-full h-full pt-12 pb-8 px-6">
        
        {/* 1. TOP SECTION: Icon, Title, Name, MBTI */}
        <div className="flex flex-col items-center shrink-0">
          {/* Icon Box */}
          <div className="mb-2">
            <div className={`w-14 h-14 rounded-2xl bg-white/10 border border-white/30 flex items-center justify-center shadow-lg backdrop-blur-sm`}>
              <Icon size={28} className="text-white drop-shadow-md" />
            </div>
          </div>

          {/* Role Title */}
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase opacity-90 text-shadow-sm mb-1">
            {meta.title}
          </div>

          {/* Name & MBTI Group */}
          <div className="flex flex-col items-center justify-center w-full mt-1">
            {/* Name: Increased padding and line-height to prevent clipping of ascenders/descenders */}
            <div className="w-full text-center px-1 pb-1">
               <h1 className="text-[56px] font-black tracking-tighter drop-shadow-2xl leading-snug w-full break-words">
                 {user.name.toUpperCase()}
               </h1>
            </div>
            
            {/* MBTI Code & Alias */}
            <div className="flex items-center justify-center gap-3 w-full text-white/95 text-shadow-md leading-none mt-2">
              <span className="text-2xl font-bold font-mono tracking-widest">
                {mbtiFull}
              </span>
              <span className="text-xl opacity-60 font-light">
                |
              </span>
              {mbtiTitle && (
                <span className="text-2xl font-bold tracking-tighter">
                  {mbtiTitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. MIDDLE SECTION: Interest Card */}
        {/* 'flex-1' pushes this section to occupy available space, centering it optically between Top and Bottom */}
        <div className="flex-1 flex items-center justify-center w-full py-2 min-h-0">
          <div className="w-[90%] relative group">
            <div className="w-full bg-white/10 border border-white/20 rounded-xl p-5 text-center shadow-xl backdrop-blur-sm relative overflow-hidden">
               {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-0" />
              
              <div className="relative z-10 text-[9px] uppercase tracking-widest text-white/70 mb-2 font-semibold">
                My Top Interest in 2026
              </div>
              <div className="relative z-10 text-2xl font-bold leading-snug break-keep tracking-tight text-white drop-shadow-sm">
                {user.interest}
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM SECTION: Alcohol & Footer */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          {/* Alcohol Score */}
          <div className="flex items-center gap-2 p-2 rounded-full bg-black/10 backdrop-blur-sm border border-white/5">
             {Array.from({ length: 5 }).map((_, i) => (
               <div 
                 key={i} 
                 className={`h-2 w-2 rounded-full shadow-sm transition-all duration-300 ${i < user.alcoholScore ? 'bg-white scale-110' : 'bg-white/20 scale-90'}`} 
               />
             ))}
          </div>
          
          {/* Event Name */}
          <div className="text-[10px] tracking-[0.25em] font-bold uppercase opacity-50">
            2026 Q1 VOLTUP TOWNHALL
          </div>
        </div>

      </div>
    </div>
  );
};

export default Badge;
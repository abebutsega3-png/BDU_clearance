import React from 'react';
import universitySeal from '../assets/image-transparent.png';

export default function TopHeader() {
  return (
    <div className="flex items-center">
      <img
        src={universitySeal}
        alt="Bahir Dar University seal"
        className="mr-3 h-12 w-12 rounded-full object-contain"
      />
      <div className="leading-tight">
        <h1 className="text-base font-bold tracking-wider text-white sm:text-lg">BAHIR DAR UNIVERSITY</h1>
        <p className="text-[10px] font-medium tracking-[0.24em] text-amber-400">EMPLOYEE CLEARANCE SYSTEM</p>
      </div>
    </div>
  );
}
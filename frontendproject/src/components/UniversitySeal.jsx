import React from 'react';
import universitySeal from '../assets/image-transparent.png';

export default function UniversitySeal({ className = 'h-11 w-11' }) {
  return (
    <img
      src={universitySeal}
      alt="Bahir Dar University seal"
      className={`${className} shrink-0 rounded-full object-contain`}
    />
  );
}

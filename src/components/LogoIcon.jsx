import React from 'react';

export default function LogoIcon({ className = "w-6 h-6 text-green-600" }) {
  return (
    <svg 
      className={className} 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.5 20V4h9a4 4 0 0 1 0 8h-3v8 M5.5 12h3" />
    </svg>
  );
}

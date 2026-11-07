import React from 'react';

interface QuenricLogoProps {
  className?: string;
}

export const QuenricLogo: React.FC<QuenricLogoProps> = ({ className = 'h-7 w-auto' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 180"
      className={className}
      fill="none"
      role="img"
      aria-label="QUENRIC"
    >
      <defs>
        <linearGradient id="h-left-grad" x1="42" y1="62" x2="115" y2="168" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#384152" />
          <stop offset="18%" stopColor="#8C99AC" />
          <stop offset="48%" stopColor="#F7F9FC" />
          <stop offset="76%" stopColor="#B8C4D4" />
          <stop offset="100%" stopColor="#141923" />
        </linearGradient>

        <linearGradient id="h-fold-shadow" x1="55" y1="58" x2="72" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D1017" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0D1017" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="h-top-grad" x1="40" y1="42" x2="162" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="32%" stopColor="#EBF0F7" />
          <stop offset="68%" stopColor="#7B8FA6" />
          <stop offset="92%" stopColor="#3B495C" />
          <stop offset="100%" stopColor="#161C26" />
        </linearGradient>

        <linearGradient id="h-tail-grad" x1="95" y1="108" x2="172" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#C8D4E3" />
          <stop offset="100%" stopColor="#697D96" />
        </linearGradient>
      </defs>

      {/* Left Q Emblem (Scaled & Optically Aligned) */}
      <g transform="translate(10, 2) scale(0.88)">
        <path
          d="M 31 68 C 20 94, 23 130, 42 151 C 58 168, 84 170, 121 170 L 97 144 C 73 144, 56 128, 56 102 C 56 77, 70 60, 94 60 C 62 60, 42 61, 31 68 Z"
          fill="url(#h-left-grad)"
        />
        <path
          d="M 31 68 C 42 61, 62 60, 94 60 C 70 60, 56 77, 56 102 C 56 85, 44 72, 31 68 Z"
          fill="url(#h-fold-shadow)"
        />
        <path
          d="M 31 68 C 46 39, 73 26, 102 26 C 143 26, 169 56, 169 98 C 169 118, 161 135, 150 146 L 131 125 C 137 117, 140 107, 140 96 C 140 72, 123 60, 95 60 C 63 60, 43 60, 31 68 Z"
          fill="url(#h-top-grad)"
        />
        <path d="M 93 108 L 125 108 L 178 170 L 145 170 Z" fill="url(#h-tail-grad)" />
      </g>

      {/* Right QUENRIC Wordmark */}
      <g transform="translate(216, 72)" fill="#F2F5F8">
        <path
          fillRule="evenodd"
          d="M 19 0 C 8.5 0, 0 8.1, 0 18 C 0 27.9, 8.5 36, 19 36 C 23.4 36, 27.4 34.6, 30.6 32.2 L 34.5 36 L 39.2 31.8 L 34.8 27.5 C 36.8 24.7, 38 21.5, 38 18 C 38 8.1, 29.5 0, 19 0 Z M 19 5.6 C 11.8 5.6, 6.2 11.1, 6.2 18 C 6.2 24.9, 11.8 30.4, 19 30.4 C 22 30.4, 24.7 29.4, 26.8 27.7 L 21.5 22.6 L 25.8 18.6 L 30.6 23.3 C 31.4 21.7, 31.8 19.9, 31.8 18 C 31.8 11.1, 26.2 5.6, 19 5.6 Z"
        />
        <path d="M 68 0 H 74.2 V 20.2 C 74.2 26.5, 78.4 30.4, 84.6 30.4 C 90.8 30.4, 95 26.5, 95 20.2 V 0 H 101.2 V 20.6 C 101.2 30.2, 94.4 36, 84.6 36 C 74.8 36, 68 30.2, 68 20.6 V 0 Z" />
        <path d="M 133 0 H 162 V 5.5 H 139.2 V 15.1 H 159.5 V 20.5 H 139.2 V 30.5 H 162.5 V 36 H 133 V 0 Z" />
        <path d="M 193 0 H 199 L 220.5 25.8 V 0 H 226.5 V 36 H 220.8 L 199 9.8 V 36 H 193 V 0 Z" />
        <path
          fillRule="evenodd"
          d="M 259 0 H 276.5 C 284.8 0, 290.2 4.7, 290.2 11.8 C 290.2 17.2, 286.7 21.2, 281.1 22.7 L 291.5 36 H 284.1 L 274.5 23.4 H 265.2 V 36 H 259 V 0 Z M 265.2 5.5 V 18.1 H 276 C 281.1 18.1, 284 15.7, 284 11.8 C 284 7.9, 281.1 5.5, 276 5.5 H 265.2 Z"
        />
        <path d="M 322 0 H 328.4 V 36 H 322 V 0 Z" />
        <path d="M 378.5 0 C 385.5 0, 391.2 2.8, 395.2 7.5 L 390.4 11.4 C 387.4 7.8, 383.3 5.6, 378.4 5.6 C 370.8 5.6, 365.2 11.1, 365.2 18 C 365.2 24.9, 370.8 30.4, 378.4 30.4 C 383.4 30.4, 387.5 28.1, 390.6 24.4 L 395.4 28.2 C 391.3 33.1, 385.6 36, 378.5 36 C 367.4 36, 358.8 28.1, 358.8 18 C 358.8 7.9, 367.4 0, 378.5 0 Z" />
      </g>
    </svg>
  );
};

export default QuenricLogo;

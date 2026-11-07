import React from 'react';
import { BrandLogo } from './BrandLogo';

export interface SplashScreenProps {
  message?: string;
}

/**
 * Official Muwazib Splash / Session Loading Screen.
 * Displays the official typographic wordmark with tagline and a subtle pulse animation.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'جاري التحقق من جلسة العمل وتحميل بيانات النظام...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F4F8F6] dark:bg-[#0D1E18] text-[#122B23] dark:text-[#F4F8F6] transition-colors duration-300">
      <div className="flex flex-col items-center justify-center space-y-6 max-w-sm px-4 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Brand Wordmark with Tagline */}
        <div className="relative flex items-center justify-center p-4">
          <div className="absolute -inset-4 rounded-3xl bg-[#0B5D43]/10 dark:bg-[#3E9B78]/10 blur-xl animate-pulse" />
          <BrandLogo
            variant="wordmark"
            className="h-20 sm:h-24 w-auto relative z-10 filter drop-shadow-md animate-pulse"
            alt="شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل"
          />
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-48 h-1.5 bg-[#D8E5DF] dark:bg-[#1E4638] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0B5D43] via-[#3E9B78] to-[#0B5D43] rounded-full animate-indeterminate" />
        </div>

        <p className="text-xs font-medium text-[#3E544C] dark:text-[#A3C7B9] tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;

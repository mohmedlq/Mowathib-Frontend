import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg text-[#5F6B73] hover:text-[#17252B] hover:bg-[#EEF2F3] dark:text-[#9BAAB1] dark:hover:text-[#F0F4F6] dark:hover:bg-[#212E33] border border-[#DCE3E6] dark:border-[#28373D] bg-white dark:bg-[#182226] transition-all cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#245B63] ${className}`}
      title={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#FACC15] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-[#245B63] transition-transform duration-300 hover:-rotate-12" />
      )}
      <span className="sr-only">
        {isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      </span>
    </button>
  );
}

export default ThemeToggle;

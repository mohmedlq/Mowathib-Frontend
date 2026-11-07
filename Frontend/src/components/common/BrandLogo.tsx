import React from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { cn } from '../../shared/utils/cn';

// Direct SVG imports for reliable bundling
import faviconSvg from '../../assets/Logos/Favicon.svg';
import logoPrimarySvg from '../../assets/Logos/logo-primary.svg';
import logoSecondarySvg from '../../assets/Logos/logo-secondary.svg';
import logoWordmarkSvg from '../../assets/Logos/logo-wordmark.svg';

export interface BrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Logo variant:
   * - 'primary': Main horizontal logo (Dark text + Emerald icon) for light backgrounds
   * - 'secondary': Badge logo (White text + Icon on dark emerald surface) for dark mode
   * - 'favicon': Square app icon logo (40x40 standard)
   * - 'wordmark': Typographic signature with official tagline
   */
  variant?: 'primary' | 'secondary' | 'favicon' | 'wordmark';

  /**
   * Automatically switches between logo-primary.svg and logo-secondary.svg
   * based on the active light/dark theme.
   */
  autoTheme?: boolean;

  /**
   * When true, automatically switches to favicon.svg (40px x 40px)
   * for collapsed sidebars or compact mobile headers.
   */
  collapsed?: boolean;

  /**
   * Additional custom CSS classes.
   */
  className?: string;

  /**
   * Accessible description in Arabic.
   */
  alt?: string;

  /**
   * Image loading behavior, defaults to 'eager' for above-the-fold logos.
   */
  loading?: 'eager' | 'lazy';
}

/**
 * Reusable, theme-aware BrandLogo component for Muwazib (مواظب).
 * Adheres strictly to the official Brand Identity & Dynamic Logo Placement rules.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'primary',
  autoTheme = false,
  collapsed = false,
  className,
  alt = 'شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل',
  loading = 'eager',
  ...props
}) => {
  // Read current theme safely with fallback
  let isDark = false;
  try {
    const themeContext = useTheme();
    isDark = themeContext.isDark;
  } catch {
    if (typeof document !== 'undefined') {
      isDark = document.documentElement.classList.contains('dark');
    }
  }

  // Determine which logo source to render
  let logoSrc: string;
  let defaultSizeClass = '';

  if (collapsed) {
    logoSrc = faviconSvg;
    defaultSizeClass = 'w-10 h-10 object-contain';
  } else if (variant === 'favicon') {
    logoSrc = faviconSvg;
    defaultSizeClass = 'w-10 h-10 object-contain';
  } else if (variant === 'wordmark') {
    logoSrc = logoWordmarkSvg;
    defaultSizeClass = 'h-11 sm:h-12 w-auto object-contain';
  } else if (autoTheme) {
    logoSrc = isDark ? logoSecondarySvg : logoPrimarySvg;
    defaultSizeClass = 'h-9 sm:h-10 w-auto object-contain';
  } else if (variant === 'secondary') {
    logoSrc = logoSecondarySvg;
    defaultSizeClass = 'h-9 sm:h-10 w-auto object-contain';
  } else {
    logoSrc = logoPrimarySvg;
    defaultSizeClass = 'h-9 sm:h-10 w-auto object-contain';
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      loading={loading}
      className={cn(
        'select-none transition-all duration-200 shrink-0 inline-block',
        defaultSizeClass,
        className
      )}
      {...props}
    />
  );
};

export default BrandLogo;

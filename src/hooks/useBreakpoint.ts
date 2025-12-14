import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1400,
};

export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowWidth < BREAKPOINTS.md,
    isTablet: windowWidth >= BREAKPOINTS.md && windowWidth < BREAKPOINTS.lg,
    isDesktop: windowWidth >= BREAKPOINTS.lg,
    width: windowWidth,
    breakpoint: windowWidth < BREAKPOINTS.sm
      ? 'xs'
      : windowWidth < BREAKPOINTS.md
      ? 'sm'
      : windowWidth < BREAKPOINTS.lg
      ? 'md'
      : windowWidth < BREAKPOINTS.xl
      ? 'lg'
      : windowWidth < BREAKPOINTS['2xl']
      ? 'xl'
      : '2xl',
  };
}

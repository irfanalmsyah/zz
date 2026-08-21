import { keyframes } from '@emotion/react';

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Stagger entrance for rows/cards that load together (page load, game switch).
// Capped so a long list doesn't get a long tail of delay.
export function staggerSx(index) {
  return {
    animation: `${fadeInUp} 240ms cubic-bezier(0.23, 1, 0.32, 1) both`,
    animationDelay: `${Math.min(index, 8) * 40}ms`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}

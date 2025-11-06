import { memo } from 'react';

interface GradientOverlayProps {
  className?: string;
}

export const GradientOverlay = memo<GradientOverlayProps>(({ className = '' }) => {
  return (
    <>
      {/* 基础径向渐变 - 最底层 */}
      <div
        className={`absolute inset-0 -z-30 ${className}`}
        style={{
          background: `radial-gradient(
            ellipse 150% 100% at 50% 20%,
            rgb(var(--color-primary) / 0.18) 0%,
            rgb(var(--color-primary) / 0.08) 40%,
            transparent 70%
          )`
        }}
        role="presentation"
        aria-hidden="true"
      />

      {/* 双向渐变层 - color-burn 模式 */}
      <div
        className="absolute inset-0 -z-30 mix-blend-color-burn opacity-40"
        style={{
          background: `
            linear-gradient(to bottom,
              rgb(var(--sentiment-positive-primary) / 0.15) 0%,
              transparent 50%,
              rgb(var(--sentiment-negative-primary) / 0.15) 100%
            )
          `
        }}
        aria-hidden="true"
      />

      {/* SVG 多色渐变 - overlay 模式 */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute -top-10 left-1/2 -z-30 w-full max-w-[1400px] -translate-x-1/2 mix-blend-overlay opacity-50"
        aria-hidden="true"
        role="presentation"
      >
        <defs>
          <radialGradient
            id="hero-gradient-primary"
            cx="50%"
            cy="25%"
            r="60%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity="0.7" />
            <stop offset="30%" stopColor="rgb(var(--sentiment-positive-primary))" stopOpacity="0.5" />
            <stop offset="60%" stopColor="rgb(var(--sentiment-neutral-primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* 第二个渐变 - 增加复杂度 */}
          <radialGradient
            id="hero-gradient-secondary"
            cx="30%"
            cy="50%"
            r="40%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgb(var(--sentiment-positive-primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <radialGradient
            id="hero-gradient-tertiary"
            cx="70%"
            cy="50%"
            r="40%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgb(var(--sentiment-neutral-primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="500" fill="url(#hero-gradient-primary)" />
        <rect width="1000" height="500" fill="url(#hero-gradient-secondary)" />
        <rect width="1000" height="500" fill="url(#hero-gradient-tertiary)" />
      </svg>

      {/* 边缘晕影效果 */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          background: `radial-gradient(
            ellipse 100% 80% at 50% 50%,
            transparent 30%,
            rgb(var(--color-background) / 0.3) 70%,
            rgb(var(--color-background) / 0.8) 100%
          )`
        }}
        aria-hidden="true"
      />
    </>
  );
});

GradientOverlay.displayName = 'GradientOverlay';

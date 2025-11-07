import { motion } from 'framer-motion';
import { memo, ReactNode } from 'react';
import { BackgroundLayers } from './BackgroundLayers';
import { GradientOverlay } from './GradientOverlay';
import { AnimatedCanvas } from './AnimatedCanvas';

export interface HeroSectionProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  actions?: ReactNode;
  showAnimation?: boolean;
  showBackground?: boolean;
  className?: string;
  contentClassName?: string;
}

export const HeroSection = memo<HeroSectionProps>(({
  title,
  description,
  actions,
  showAnimation = true,
  showBackground = true,
  className = '',
  contentClassName = ''
}) => {
  return (
    <section
      className={`
        relative isolate overflow-hidden
        bg-background
        py-20 sm:py-28 md:py-32 lg:py-36
        ${className}
      `}
      role="banner"
      aria-label="Hero Section"
    >
      {/*
        清晰的层级体系（从底到顶）：
        -z-40: 背景装饰图片
        -z-30: 渐变遮罩
        -z-20: Canvas 动画
        z-10: 内容
      */}

      {/* 背景装饰层 */}
      {showBackground && <BackgroundLayers />}

      {/* 渐变遮罩层 */}
      {showBackground && <GradientOverlay />}

      {/* Canvas 动画层 */}
      {showAnimation && (
        <div className="absolute inset-0 -z-20" aria-hidden="true">
          <AnimatedCanvas />
        </div>
      )}

      {/* 内容区域 */}
      <div
        className={`
          relative z-10
          mx-auto max-w-7xl
          px-6 sm:px-8 lg:px-12 xl:px-16
          text-center
          ${contentClassName}
        `}
      >
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {typeof title === 'string' ? (
            <h1
              className="
                mx-auto max-w-4xl
                text-balance
                text-4xl font-bold tracking-tight text-foreground
                sm:text-5xl
                md:text-6xl
                lg:text-7xl
                xl:text-8xl
                drop-shadow-sm
              "
              style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              {title}
            </h1>
          ) : (
            title
          )}
        </motion.div>

        {/* 描述文本 */}
        {description && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-6 sm:mt-8"
          >
            {typeof description === 'string' ? (
              <p className="
                mx-auto max-w-2xl
                text-lg text-foreground/80
                sm:text-xl
                md:text-2xl
                leading-relaxed
                drop-shadow-sm
              ">
                {description}
              </p>
            ) : (
              description
            )}
          </motion.div>
        )}

        {/* 行动按钮 */}
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-10 sm:mt-12 flex items-center justify-center gap-x-6 gap-y-3 flex-wrap"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

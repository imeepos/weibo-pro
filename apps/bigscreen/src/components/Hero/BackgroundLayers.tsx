import { memo } from 'react';

interface BackgroundLayersProps {
  imageUrl?: string;
  className?: string;
}

export const BackgroundLayers = memo<BackgroundLayersProps>(({
  imageUrl = '/assets/circuit-pattern.svg',
  className = ''
}) => {
  return (
    <div
      className={`absolute inset-0 -z-40 ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* 左侧装饰图片 */}
      <div className="absolute -top-8 right-1/2 sm:top-5 md:-top-12 aspect-square w-[600px] sm:w-[800px] lg:w-[900px] opacity-20 md:opacity-30 mix-blend-soft-light">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          aria-hidden="true"
          onError={(e) => {
            // 图片加载失败时隐藏
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* 右侧镜像装饰图片 */}
      <div className="absolute -top-8 right-1/2 origin-right -scale-x-100 sm:top-5 md:-top-12 aspect-square w-[600px] sm:w-[800px] lg:w-[900px] opacity-20 md:opacity-30 mix-blend-soft-light">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          aria-hidden="true"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
});

BackgroundLayers.displayName = 'BackgroundLayers';

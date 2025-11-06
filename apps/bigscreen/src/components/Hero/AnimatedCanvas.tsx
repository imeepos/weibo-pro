import { useEffect, useRef, memo, useMemo } from 'react';

interface Point {
  x: number;
  y: number;
}

interface CircuitPath {
  path2D: Path2D;
  points: Point[];
  progress: number;
  speed: number;
  color: string;
  glowColor: string;
  lineWidth: number;
}

interface AnimatedCanvasProps {
  className?: string;
  pathCount?: number;
}

export const AnimatedCanvas = memo<AnimatedCanvasProps>(({
  className = '',
  pathCount = 6
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pathsRef = useRef<CircuitPath[]>([]);

  // 预计算颜色，避免每帧字符串操作
  const colors = useMemo(() => {
    const baseColors = [
      { r: 59, g: 130, b: 246 },   // primary blue
      { r: 99, g: 180, b: 246 },   // lighter blue
      { r: 139, g: 92, b: 246 },   // purple
      { r: 34, g: 211, b: 238 },   // cyan
    ];

    return Array.from({ length: pathCount }, (_, i) => {
      const base = baseColors[i % baseColors.length];
      const variation = 20;
      return {
        stroke: `rgba(${base.r + (Math.random() - 0.5) * variation}, ${base.g + (Math.random() - 0.5) * variation}, ${base.b + (Math.random() - 0.5) * variation}, 0.4)`,
        glow: `rgba(${base.r}, ${base.g}, ${base.b}, 0.9)`
      };
    });
  }, [pathCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // 性能优化
    });
    if (!ctx) return;

    // 设置 Canvas 分辨率（支持 Retina）
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制最大 2x，避免过度渲染
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    // 生成更自然的贝塞尔曲线路径
    const generatePath = (index: number): Point[] => {
      const points: Point[] = [];
      const segments = 4 + Math.floor(Math.random() * 2);
      const yOffset = ((index / pathCount) - 0.5) * rect.height * 0.7;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const randomness = 60 + Math.random() * 40;

        points.push({
          x: rect.width * t + (Math.random() - 0.5) * randomness,
          y: rect.height * 0.5 + yOffset + Math.sin(t * Math.PI * 2) * 30 + (Math.random() - 0.5) * 50
        });
      }

      return points;
    };

    // 创建 Path2D 对象（性能优化）
    const createPath2D = (points: Point[]): Path2D => {
      const path = new Path2D();
      path.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) * 0.4;
        const cp1y = prev.y;
        const cp2x = prev.x + (curr.x - prev.x) * 0.6;
        const cp2y = curr.y;

        path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }

      return path;
    };

    // 初始化路径（只创建一次）
    if (pathsRef.current.length === 0) {
      pathsRef.current = Array.from({ length: pathCount }, (_, i) => {
        const points = generatePath(i);
        return {
          path2D: createPath2D(points),
          points,
          progress: Math.random(),
          speed: 0.0008 + Math.random() * 0.0015,
          color: colors[i].stroke,
          glowColor: colors[i].glow,
          lineWidth: 1.5 + Math.random() * 0.5
        };
      });
    }

    const paths = pathsRef.current;

    // 绘制单个路径
    const drawPath = (path: CircuitPath) => {
      const { path2D, points, progress, color, glowColor, lineWidth } = path;

      // 绘制路径线条
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -progress * 220;
      ctx.stroke(path2D);

      // 绘制流动光点
      const totalPoints = points.length - 1;
      const currentIndex = Math.floor(progress * totalPoints);
      const nextIndex = Math.min(currentIndex + 1, totalPoints);
      const t = (progress * totalPoints) % 1;

      const curr = points[currentIndex];
      const next = points[nextIndex];
      const glowX = curr.x + (next.x - curr.x) * t;
      const glowY = curr.y + (next.y - curr.y) * t;

      // 主光点
      const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 10);
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(glowX, glowY, 10, 0, Math.PI * 2);
      ctx.fill();

      // 拖尾效果
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(glowX, glowY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    let lastTime = performance.now();
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    // 优化的动画循环
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      // 限制帧率，避免过度渲染
      if (deltaTime >= frameTime) {
        ctx.clearRect(0, 0, rect.width, rect.height);

        paths.forEach(path => {
          drawPath(path);
          path.progress += path.speed * (deltaTime / 16); // 标准化到 60fps
          if (path.progress > 1) {
            path.progress = 0;
          }
        });

        lastTime = currentTime;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // 响应式处理
    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * dpr;
      canvas.height = newRect.height * dpr;
      ctx.scale(dpr, dpr);

      // 重新生成路径
      pathsRef.current = pathsRef.current.map((path, i) => {
        const points = generatePath(i);
        return {
          ...path,
          path2D: createPath2D(points),
          points
        };
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [pathCount, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
      role="presentation"
    />
  );
});

AnimatedCanvas.displayName = 'AnimatedCanvas';

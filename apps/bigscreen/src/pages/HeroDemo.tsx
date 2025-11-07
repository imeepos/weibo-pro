import { HeroSection } from '../components/Hero';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HeroDemo() {
  return (
    <div className="min-h-screen">
      {/* 示例 1：完整功能 Hero */}
      <HeroSection
        title={
          <h1
            className="
              mx-auto max-w-4xl text-balance
              text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
              font-bold tracking-tight
              bg-gradient-to-r from-primary via-sentiment-positive-primary to-sentiment-neutral-primary
              bg-clip-text text-transparent
              drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]
            "
            style={{
              WebkitTextStroke: '0.5px rgba(59, 130, 246, 0.1)',
            }}
          >
            社交媒体舆情监控系统
          </h1>
        }
        description={
          <p className="
            mx-auto max-w-2xl
            text-lg sm:text-xl md:text-2xl
            leading-relaxed text-foreground/90
            drop-shadow-sm
          ">
            实时监控社交媒体动态，智能分析舆情趋势，为您的品牌保驾护航
          </p>
        }
        actions={
          <>
            <button className="glass-button" aria-label="开始使用系统">
              开始使用
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="glass-button glass-button-secondary" aria-label="查看演示">
              <Sparkles className="w-4 h-4" />
              查看演示
            </button>
          </>
        }
        showAnimation
        showBackground
      />

      {/* 示例 2：简洁版本（无背景动画） */}
      <HeroSection
        title="简洁版 Hero 区域"
        description="适用于内容页面的轻量级 Hero 区域，不包含背景装饰和动画效果"
        showAnimation={false}
        showBackground={false}
        className="py-16"
      />

      {/* 示例 3：自定义样式 */}
      <HeroSection
        title={
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
            <span className="block text-foreground drop-shadow-lg">数据驱动决策</span>
            <span className="block text-primary mt-2 drop-shadow-[0_2px_20px_rgba(59,130,246,0.5)]">
              洞察引领未来
            </span>
          </h1>
        }
        description={
          <div className="space-y-6">
            <p className="text-lg sm:text-xl md:text-2xl text-foreground/85 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
              通过 AI 驱动的舆情分析引擎，实时捕捉网络动态
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm sm:text-base text-muted-foreground">
              <div className="flex items-center gap-2 group transition-all hover:scale-110">
                <div className="w-2.5 h-2.5 rounded-full bg-sentiment-positive-primary shadow-lg shadow-sentiment-positive-primary/50 animate-pulse" />
                <span className="group-hover:text-foreground transition-colors">实时监控</span>
              </div>
              <div className="flex items-center gap-2 group transition-all hover:scale-110">
                <div className="w-2.5 h-2.5 rounded-full bg-sentiment-neutral-primary shadow-lg shadow-sentiment-neutral-primary/50 animate-pulse" />
                <span className="group-hover:text-foreground transition-colors">智能分析</span>
              </div>
              <div className="flex items-center gap-2 group transition-all hover:scale-110">
                <div className="w-2.5 h-2.5 rounded-full bg-sentiment-negative-primary shadow-lg shadow-sentiment-negative-primary/50 animate-pulse" />
                <span className="group-hover:text-foreground transition-colors">预警系统</span>
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <button className="glass-button text-base px-8 py-4" aria-label="免费试用">
              免费试用
            </button>
            <button className="glass-button glass-button-secondary text-base px-8 py-4" aria-label="联系销售">
              联系销售
            </button>
          </div>
        }
        showAnimation
        showBackground
        className="py-24 sm:py-32 md:py-40"
      />

      {/* 内容区域示例 */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-3 text-foreground">实时监控</h3>
            <p className="text-muted-foreground">
              24/7 全天候监控社交媒体平台，第一时间捕捉关键信息
            </p>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-3 text-foreground">智能分析</h3>
            <p className="text-muted-foreground">
              基于 NLP 的情感分析引擎，精准识别舆情倾向和趋势
            </p>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-3 text-foreground">预警系统</h3>
            <p className="text-muted-foreground">
              多级预警机制，及时发现并应对潜在舆情危机
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

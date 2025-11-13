import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react'
export default function HeroDemo() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div ref={containerRef} className="h-full overflow-y-hidden overflow-x-hidden bg-background">
      {/* Hero Section - 极简大标题风格 */}
      <motion.section
        style={{ opacity, scale }}
        className="min-h-screen flex items-center justify-center relative px-6"
      >
        {/* 背景网格 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* 未来感渐变光晕 - 多层叠加 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-cyan/30 via-primary/20 to-transparent blur-3xl rounded-full animate-pulse-slow" />
        <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-violet/20 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-fuchsia/20 to-transparent blur-3xl rounded-full" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* 徽章 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">新一代舆情监控平台</span>
          </motion.div>

          {/* 主标题 - 未来感霓虹渐变 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6"
          >
            <span className="block text-foreground">实时洞察</span>
            <span className="block bg-gradient-to-r from-cyan via-primary to-violet bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,217,255,0.3)] dark:drop-shadow-[0_0_50px_rgba(0,217,255,0.5)]">
              舆情态势
            </span>
          </motion.h1>

          {/* 副标题 */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl sm:text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            通过 AI 驱动的智能分析，让每一个决策都有数据支撑
          </motion.p>

          {/* CTA 按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/index')}
              className="group relative px-8 py-4 bg-foreground text-background rounded-full font-semibold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:shadow-[0_0_40px_rgba(0,217,255,0.6)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                开始体验
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan via-primary to-violet opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>

          {/* 社会认证 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sentiment-positive-primary" />
              <span>500+ 企业信赖</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sentiment-positive-primary" />
              <span>99.9% 系统可用性</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sentiment-positive-primary" />
              <span>千万级日处理量</span>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

import React from 'react';
import { Activity, Users, Network, Brain, MessageSquare, FileText, GitBranch, BarChart3, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@sker/ui/components/ui/popover';

// 页面导航选项 - 简洁的9宫格设计
export const navigationOptions = [
  {
    id: 'data-overview',
    label: '数据总览',
    path: '/index',
    icon: BarChart3,
    description: '全面数据概览与统计'
  },
  {
    id: 'event-analysis',
    label: '事件分析',
    path: '/event-analysis',
    icon: Activity,
    description: '热点事件深度分析'
  },
  {
    id: 'user-detection',
    label: '媒体检测面板',
    path: '/user-detection',
    icon: Users,
    description: '用户行为监测分析'
  },
  {
    id: 'user-relation-topology',
    label: '用户关系拓扑',
    path: '/user-relation-topology',
    icon: Network,
    description: '用户关系网络可视化'
  },
  {
    id: 'memory-graph',
    label: '记忆图谱',
    path: '/memory-graph',
    icon: GitBranch,
    description: '角色记忆关系可视化'
  },
  {
    id: 'workflow-management',
    label: '工作流管理',
    path: '/workflow-management',
    icon: GitBranch,
    description: '可视化工作流编排与管理'
  },
  {
    id: 'prompt-management',
    label: 'Prompt 管理',
    path: '/prompt-management',
    icon: FileText,
    description: '提示词角色与技能管理'
  },
  {
    id: 'llm-management',
    label: 'LLM 管理',
    path: '/llm-management',
    icon: Brain,
    description: '大语言模型配置与管理'
  },
  {
    id: 'llm-chat-logs',
    label: 'LLM 对话日志',
    path: '/llm-chat-logs',
    icon: MessageSquare,
    description: 'LLM 对话记录与分析'
  }
] as const;

const QuickNavigation: React.FC = () => {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <Popover open={navOpen} onOpenChange={setNavOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-muted/20 transition-all duration-300 group"
          title="布局设置"
        >
          <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-90 transition-all duration-300" />
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all duration-300" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[520px] glass-card rounded-xl shadow-2xl overflow-hidden p-0 border border-border/50"
      >
        {/* 顶部渐变装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          {/* 标题区域 */}
          <div className="backdrop-blur-xl bg-background/80 border-b border-border/30 px-5 py-3">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10">
                <Settings className="w-3.5 h-3.5 text-primary" />
              </div>
              快速导航
            </h3>
          </div>

          {/* 3x3网格导航 */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2.5">
              {navigationOptions.map((option, index) => {
                const IconComponent = option.icon;
                const isActive = window.location.pathname === option.path;

                return (
                  <button
                    key={option.id}
                    onClick={() => { setNavOpen(false); navigate(option.path); }}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className={cn(
                      'relative group overflow-hidden rounded-lg transition-all duration-300',
                      'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
                      'flex flex-col items-center justify-center gap-2 p-3',
                      'min-h-[100px]',
                      isActive
                        ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/20'
                        : 'bg-muted/20 hover:bg-muted/30 text-foreground border border-border/20 hover:border-primary/20'
                    )}
                  >
                    {/* 活动状态装饰 */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
                    )}

                    {/* 悬停光效 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    </div>

                    {/* 图标 */}
                    <div className={cn(
                      "relative p-2.5 rounded-lg transition-all duration-300",
                      "group-hover:scale-105",
                      isActive
                        ? "bg-white/15"
                        : "bg-background/40 group-hover:bg-primary/10"
                    )}>
                      <IconComponent className={cn(
                        "w-5 h-5 transition-all duration-300",
                        isActive
                          ? "text-primary-foreground"
                          : "text-foreground group-hover:text-primary"
                      )} />
                    </div>

                    {/* 文本内容 */}
                    <div className="relative text-center space-y-0.5">
                      <div className={cn(
                        "font-medium text-xs flex items-center justify-center gap-1",
                        "transition-colors duration-300"
                      )}>
                        <span className="truncate max-w-[120px]">{option.label}</span>
                        {isActive && (
                          <div className="flex-shrink-0 w-1 h-1 bg-current rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className={cn(
                        "text-[10px] line-clamp-2 transition-colors duration-300 leading-snug",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground group-hover:text-foreground/70"
                      )}>
                        {option.description}
                      </div>
                    </div>

                    {/* 角标装饰 */}
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white/40 rounded-full animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 底部提示 */}
          <div className="backdrop-blur-xl bg-background/80 border-t border-border/30 px-4 py-2">
            <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground text-[9px] font-mono">ESC</kbd>
              <span className="opacity-50">关闭</span>
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuickNavigation;

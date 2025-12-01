import React from 'react';
import { Clock, Activity, Settings, Maximize, Minimize, Sun, Moon, User, ChevronDown, BarChart3, Users, Network, LogIn, Search, Sparkles, Shield } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFullscreenShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatTime, cn } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@sker/ui/components/ui/popover';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const {
    systemStatus,
    selectedTimeRange,
    setSelectedTimeRange
  } = useAppStore();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { isFullscreen, isSupported, toggleFullscreen, exitFullscreen } = useFullscreen();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // 注册全屏快捷键
  useFullscreenShortcuts(toggleFullscreen, exitFullscreen);

  // 更新当前时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 时间区间选项 - 与后端 @sker/entities TimeRange 保持一致
  const timeRangeOptions = [
    { value: '1h', label: '近1小时' },
    { value: '6h', label: '近6小时' },
    { value: '12h', label: '近12小时' },
    { value: '24h', label: '近24小时' },
    { value: '7d', label: '近7天' },
    { value: '30d', label: '近30天' },
    { value: '90d', label: '近90天' },
    { value: '180d', label: '近180天' },
    { value: '365d', label: '近365天' },
  ] as const;

  type TimeRangeValue = typeof timeRangeOptions[number]['value'];

  const isTimeRangeValue = (value: string): value is TimeRangeValue =>
    timeRangeOptions.some(option => option.value === value);

  // 页面导航选项 - 简洁的9宫格设计
  const navigationOptions = [
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
      id: 'weibo-login',
      label: '微博登录',
      path: '/workflow-editor/weibo_login',
      icon: LogIn,
      description: '微博账号登录与授权'
    },
    {
      id: 'weibo-event-crawler',
      label: '微博事件爬取',
      path: '/workflow-editor/weibo_event',
      icon: Search,
      description: '微博事件数据采集与抓取'
    },
    {
      id: 'weibo-nlp-analysis',
      label: 'NLP 情感分析',
      path: '/workflow-editor/weibo_nlp',
      icon: Sparkles,
      description: 'AI 驱动的文本情感分析'
    },
    {
      id: 'weibo-user-detection',
      label: '水军监控',
      path: '/workflow-editor/weibo_user_detection',
      icon: Shield,
      description: '智能识别与监控水军账号'
    }
  ] as const;

  return (
    <header className={cn(
      'relative z-50',
      'glass-card-flat px-6 py-2 flex items-center justify-between',
      'backdrop-blur-xl border-b',
      className
    )}>
      {/* 底部柔和分隔线 */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/15 to-transparent" />

      {/* 左侧：标题和状态 */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 group">
          {/* Logo 图标 - 添加渐变和光晕效果 */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:blur-lg transition-all duration-300" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300">
              <Activity className="w-5 h-5 text-primary-foreground drop-shadow-sm" />
            </div>
          </div>

          {/* 标题文字 */}
          <div onClick={() => {
            navigate('/')
          }}>
            <h1 className="text-2xl font-bold text-foreground">
              舆情监控大屏幕
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">实时数据分析与展示</p>
          </div>
        </div>
      </div>

      {/* 中间：时间范围选择 - 清爽的玻璃态容器 */}
      <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-muted/10 backdrop-blur-sm">
        <Clock className="w-6 h-6 text-primary/70" />
        <Select
          value={selectedTimeRange}
          onValueChange={(nextValue) => {
            if (isTimeRangeValue(nextValue)) {
              setSelectedTimeRange(nextValue);
            }
          }}
        >
          <SelectTrigger className="min-w-[140px] text-sm font-medium">
            <SelectValue placeholder="选择时间区间" />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {timeRangeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 右侧：顶部右侧菜单 - 美化操作按钮组 */}
      <div className="flex items-center space-x-3">
        {/* 当前时间 - 清爽的玻璃态卡片 */}
        <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-muted/10 backdrop-blur-sm">
          <div className="relative">
            <Clock className="w-4 h-4 text-primary/70" />
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-semibold text-foreground tabular-nums">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              更新: {formatTime(systemStatus.lastUpdate)}
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-8 w-px bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

        {/* 主题切换 - 简洁悬停效果 */}
        <button
          onClick={toggleTheme}
          className="relative p-2.5 rounded-xl hover:bg-muted/20 transition-all duration-300 group"
          title={isDark ? '切换到亮色主题' : '切换到暗黑主题'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-muted-foreground group-hover:text-warning group-hover:rotate-45 transition-all duration-300" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-rotate-12 transition-all duration-300" />
          )}
        </button>

        {/* 布局设置 - 简洁按钮 */}
        <Popover>
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
                        onClick={() => navigate(option.path)}
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

        {/* 当前用户 - 清爽用户信息 */}
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-muted/10 hover:bg-muted/20 backdrop-blur-sm transition-all duration-300 cursor-pointer group">
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <User className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full" />
          </div>
          <span className="text-sm font-medium text-foreground">管理员</span>
        </div>

        {/* 全屏按钮 - 简洁全屏控制 */}
        {isSupported && (
          <button
            onClick={() => toggleFullscreen()}
            className="p-2.5 rounded-xl hover:bg-muted/20 transition-all duration-300 group"
            title={isFullscreen ? '退出全屏 (F11)' : '进入全屏 (F11)'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-300" />
            ) : (
              <Maximize className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-300" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;

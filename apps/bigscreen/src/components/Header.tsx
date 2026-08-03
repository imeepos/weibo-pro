import React from 'react';
import { Clock, Activity, Maximize, Minimize, Sun, Moon, User } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFullscreenShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatTime, cn } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { useNavigate } from 'react-router-dom';
import QuickNavigation from './QuickNavigation';

interface HeaderProps {
  className?: string;
}

// 时间区间选项 - 与后端 @sker/entities TimeRange 保持一致
const timeRangeOptions = [
  { value: 'all', label: '全部' },
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
              监控大屏幕
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

        {/* 布局设置 - 快速导航 */}
        <QuickNavigation />

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

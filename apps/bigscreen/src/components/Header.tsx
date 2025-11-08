import React from 'react';
import { Clock, Activity, Settings, Maximize, Minimize, Sun, Moon, User, Layout, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useLayoutStore } from '@/stores/useLayoutStore';
import { useTheme } from '@/hooks/useTheme';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useFullscreenShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatTime, cn } from '@/utils';
import Select from './ui/Select';
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
  const navigate = useNavigate()
  const {
    currentLayout,
    savedLayouts,
    setCurrentLayout,
    isEditMode,
    toggleEditMode
  } = useLayoutStore();
  const { toggleTheme, isDark } = useTheme();
  const { isFullscreen, isSupported, toggleFullscreen, exitFullscreen } = useFullscreen();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = React.useState(false);

  // 注册全屏快捷键
  useFullscreenShortcuts(toggleFullscreen, exitFullscreen);

  // 更新当前时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 点击外部关闭布局菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLayoutMenuOpen && !(event.target as Element).closest('.layout-menu')) {
        setIsLayoutMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLayoutMenuOpen]);

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

  // 主题切换函数已在useTheme hook中提供

  return (
    <header className={cn(
      'relative isolate',
      'glass-card-flat px-6 py-2 flex items-center justify-between',
      'backdrop-blur-xl',
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
          className="min-w-[140px]"
          triggerClassName="text-sm font-medium"
          value={selectedTimeRange}
          onChange={(nextValue) => {
            if (isTimeRangeValue(nextValue)) {
              setSelectedTimeRange(nextValue);
            }
          }}
          options={timeRangeOptions.map(option => ({
            value: option.value,
            label: option.label,
          }))}
          placeholder="选择时间区间"
        />
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
        <div className="relative layout-menu">
          <button
            onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
            className="flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-muted/20 transition-all duration-300 group"
            title="布局设置"
          >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-90 transition-all duration-300" />
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all duration-300",
              isLayoutMenuOpen && "rotate-180"
            )} />
          </button>

          {/* 布局选择下拉菜单 - 清爽弹出框 */}
          {isLayoutMenuOpen && (
            <div className="absolute right-0 mt-3 w-72 glass-card rounded-xl shadow-xl z-50 overflow-hidden">
              {/* 顶部轻微渐变 */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />

              <div className="relative p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center">
                  <Layout className="w-4 h-4 mr-2 text-primary" />
                  选择布局方案
                </h3>
                <div className="space-y-2">
                  {savedLayouts.map((layout, index) => (
                    <button
                      key={layout.id}
                      onClick={() => {
                        setCurrentLayout(layout);
                        setIsLayoutMenuOpen(false);
                      }}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={cn(
                        'w-full text-left p-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden',
                        currentLayout?.id === layout.id
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                          : 'hover:bg-muted/30 text-foreground'
                      )}
                    >
                      {/* 活动状态渐变装饰 */}
                      {currentLayout?.id === layout.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                      )}

                      <div className="relative flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium flex items-center">
                            {layout.name}
                            {currentLayout?.id === layout.id && (
                              <div className="ml-2 w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                            )}
                          </div>
                          {layout.description && (
                            <div className="text-xs opacity-70 mt-0.5">{layout.description}</div>
                          )}
                        </div>
                        <Layout className={cn(
                          "w-4 h-4 transition-all duration-300",
                          currentLayout?.id === layout.id ? "" : "group-hover:scale-110 group-hover:rotate-12"
                        )} />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4">
                  <button
                    onClick={() => {
                      toggleEditMode();
                      setIsLayoutMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all duration-300 group"
                  >
                    <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>{isEditMode ? '退出编辑模式' : '进入编辑模式'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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

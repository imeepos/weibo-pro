import React from "react";
import { EChart } from "@sker/ui/components/ui/echart";

import { motion } from "framer-motion";
import { HotTopic } from "@/types";
import { cn } from "@/utils";
import { buildHotTopicsChartOption } from "./HotTopicsChart.utils";


interface HotTopicsChartProps {
  data: HotTopic[];
  title?: string;
  subtitle?: string;
  footnote?: string;
  height?: number;
  className?: string;
  maxTopics?: number;
  orientation?: "horizontal" | "vertical";
}

const HotTopicsChart: React.FC<HotTopicsChartProps> = React.memo(({
  data,
  title = "热点话题排行",
  subtitle,
  footnote,
  height: _height = 0,
  className,
  maxTopics = 10,
  orientation = "horizontal",
}) => {
  const option = React.useMemo(
    () => buildHotTopicsChartOption({ data, title, maxTopics, orientation }),
    [data, title, maxTopics, orientation]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn("chart-container", className)}
    >
      {(subtitle || footnote) ? (
        <div className="mb-3 space-y-1">
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          {footnote ? (
            <p className="text-[11px] text-muted-foreground/80">{footnote}</p>
          ) : null}
        </div>
      ) : null}
      {option ? (
        <EChart
          option={option}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          lazyUpdate={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          暂无热点话题数据
        </div>
      )}
    </motion.div>
  );
});

HotTopicsChart.displayName = 'HotTopicsChart';

export default HotTopicsChart;

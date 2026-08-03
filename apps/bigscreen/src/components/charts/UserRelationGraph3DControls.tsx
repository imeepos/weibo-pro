import React from 'react';
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel';
import { DEFAULT_WEIGHTS, type NodeSizeWeights } from './NodeSizeCalculator';

export interface VisualizationState {
  enableNodeShapes: boolean;
  enableNodeOpacity: boolean;
  enableNodePulse: boolean;
  enableCommunities: boolean;
}

interface UserRelationGraph3DControlsProps {
  currentWeights: NodeSizeWeights;
  onWeightsChange: (weights: NodeSizeWeights) => void;
  currentVisualization: VisualizationState;
  onVisualizationChange: (visualization: VisualizationState) => void;
}

/** 节点权重滑块标签映射 */
const WEIGHT_LABELS: Record<string, string> = {
  followers: '粉丝数',
  influence: '影响力',
  postCount: '发帖数',
  connections: '连接数',
};

/** 可视化效果开关配置 */
const VISUALIZATION_TOGGLES: Array<{ key: keyof VisualizationState; label: string }> = [
  { key: 'enableNodeShapes', label: '节点形状编码' },
  { key: 'enableNodeOpacity', label: '活跃度透明度' },
  { key: 'enableNodePulse', label: '脉动动画' },
  { key: 'enableCommunities', label: '社群颜色' },
];

/** 可视化设置控制面板 */
export const UserRelationGraph3DControls: React.FC<UserRelationGraph3DControlsProps> = ({
  currentWeights,
  onWeightsChange,
  currentVisualization,
  onVisualizationChange,
}) => {
  return (
    <GraphControlPanel title="可视化设置" position="bottom-right">
      <ControlGroup
        title="节点大小权重"
        onReset={() => onWeightsChange(DEFAULT_WEIGHTS)}
      >
        {Object.entries(currentWeights).map(([key, value]) => (
          <SliderControl
            key={key}
            label={WEIGHT_LABELS[key] || '连接数'}
            value={Math.round(value * 100)}
            min={0}
            max={100}
            suffix="%"
            onValueChange={(v) => onWeightsChange({ ...currentWeights, [key]: v / 100 })}
          />
        ))}
      </ControlGroup>

      <ControlGroup title="可视化效果">
        {VISUALIZATION_TOGGLES.map(({ key, label }) => (
          <SwitchControl
            key={key}
            label={label}
            checked={currentVisualization[key]}
            onCheckedChange={(checked) =>
              onVisualizationChange({ ...currentVisualization, [key]: checked })
            }
          />
        ))}
      </ControlGroup>
    </GraphControlPanel>
  );
};

export default UserRelationGraph3DControls;

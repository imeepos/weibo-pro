import React, { useState, useEffect } from 'react';
import { NodeSizeWeights, DEFAULT_WEIGHTS } from './NodeSizeCalculator';
import { LinkDistanceConfig, DEFAULT_LINK_CONFIG } from './LinkDistanceCalculator';

interface EnhancedControlsProps {
  nodeSizeWeights: NodeSizeWeights;
  linkDistanceConfig: LinkDistanceConfig;
  enableNodeShapes: boolean;
  enableNodeOpacity: boolean;
  enableNodePulse: boolean;
  enableCommunities: boolean;
  onWeightsChange: (weights: NodeSizeWeights) => void;
  onLinkConfigChange: (config: LinkDistanceConfig) => void;
  onVisualizationChange: (config: {
    enableNodeShapes: boolean;
    enableNodeOpacity: boolean;
    enableNodePulse: boolean;
    enableCommunities: boolean;
  }) => void;
}

export const EnhancedControls: React.FC<EnhancedControlsProps> = ({
  nodeSizeWeights,
  linkDistanceConfig,
  enableNodeShapes,
  enableNodeOpacity,
  enableNodePulse,
  enableCommunities,
  onWeightsChange,
  onLinkConfigChange,
  onVisualizationChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleWeightChange = (key: keyof NodeSizeWeights, value: number) => {
    const newWeights = { ...nodeSizeWeights, [key]: value / 100 };
    onWeightsChange(newWeights);
  };

  const handleLinkConfigChange = (key: keyof LinkDistanceConfig, value: any) => {
    const newConfig = { ...linkDistanceConfig, [key]: value };
    onLinkConfigChange(newConfig);
  };

  const handleVisualizationChange = (key: string, value: boolean) => {
    onVisualizationChange({
      enableNodeShapes,
      enableNodeOpacity,
      enableNodePulse,
      enableCommunities,
      [key]: value
    });
  };

  const resetWeights = () => {
    onWeightsChange(DEFAULT_WEIGHTS);
  };

  const resetLinkConfig = () => {
    onLinkConfigChange(DEFAULT_LINK_CONFIG);
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      {/* 控制面板开关 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 hover:bg-white transition-colors"
        title="可视化设置"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* 控制面板内容 */}
      {isOpen && (
        <div className="mt-2 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-gray-200 min-w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">可视化设置</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 节点大小权重设置 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">节点大小权重</h4>
              <button
                onClick={resetWeights}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                重置
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(nodeSizeWeights).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 capitalize">
                      {key === 'followers' && '粉丝数'}
                      {key === 'influence' && '影响力'}
                      {key === 'postCount' && '发帖数'}
                      {key === 'connections' && '连接数'}
                    </span>
                    <span className="text-gray-500">{Math.round(value * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value * 100}
                    onChange={(e) => handleWeightChange(key as keyof NodeSizeWeights, Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 连线设置 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">连线设置</h4>
              <button
                onClick={resetLinkConfig}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                重置
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">动态连线长度</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkDistanceConfig.useDynamicDistance}
                    onChange={(e) => handleLinkConfigChange('useDynamicDistance', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {linkDistanceConfig.useDynamicDistance && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">最小距离</span>
                      <span className="text-gray-500">{linkDistanceConfig.minDistance}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={linkDistanceConfig.minDistance}
                      onChange={(e) => handleLinkConfigChange('minDistance', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">最大距离</span>
                      <span className="text-gray-500">{linkDistanceConfig.maxDistance}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="300"
                      value={linkDistanceConfig.maxDistance}
                      onChange={(e) => handleLinkConfigChange('maxDistance', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 可视化效果 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">可视化效果</h4>
            <div className="space-y-2">
              {[
                { key: 'enableNodeShapes', label: '节点形状编码', value: enableNodeShapes },
                { key: 'enableNodeOpacity', label: '活跃度透明度', value: enableNodeOpacity },
                { key: 'enableNodePulse', label: '脉动动画', value: enableNodePulse },
                { key: 'enableCommunities', label: '社群颜色', value: enableCommunities }
              ].map(({ key, label, value }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleVisualizationChange(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
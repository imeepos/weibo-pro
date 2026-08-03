import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WidgetConfig } from '../../stores/useLayoutStore';

interface WidgetPanelProps {
  open: boolean;
  widgets: WidgetConfig[];
  onSelect: (widget: WidgetConfig) => void;
  onClose: () => void;
}

export const WidgetPanel: React.FC<WidgetPanelProps> = ({ open, widgets, onSelect, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-96 max-h-96 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">添加组件</h3>
            </div>

            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {widgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => onSelect(widget)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{widget.icon}</span>
                    <div>
                      <div className="font-medium">{widget.name}</div>
                      <div className="text-sm text-gray-500">{widget.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

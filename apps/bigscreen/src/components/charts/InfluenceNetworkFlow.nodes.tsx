import React from 'react';
import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';

export interface NetworkUser {
  id: string;
  name: string;
  type: string;
  influence: number;
  followers: string;
  posts: number;
  engagement: string;
  avatar?: string;
}

// 自定义用户节点组件
export const UserNode = ({ data }: { data: any }) => {
  const { user } = data;
  const size = Math.max(50, (user.influence / 100) * 100);

  const getTypeColor = (type: string) => {
    switch (type) {
      case '官方账号': return 'from-red-500 to-red-600';
      case '媒体账号': return 'from-blue-500 to-blue-600';
      case 'KOL账号': return 'from-purple-500 to-purple-600';
      case '粉丝团体': return 'from-pink-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const generateAvatar = (name: string, type: string) => {
    const seed = encodeURIComponent(name);
    const style = type === '官方账号' ? 'avataaars' :
                  type === '媒体账号' ? 'personas' :
                  type === 'KOL账号' ? 'adventurer' : 'micah';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=transparent`;
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative group cursor-pointer"
      style={{
        width: size,
        height: size,
        zIndex: 20 // 确保头像在连线上方
      }}
    >
      {/* 脉冲效果 */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />

      {/* Handle - 必须有才能连接边 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', border: '2px solid #fff' }}
      />

      {/* 用户头像 */}
      <div className="relative w-full h-full">
        <img
          src={generateAvatar(user.name, user.type)}
          alt={user.name}
          className="w-full h-full rounded-full border-4 border-white shadow-xl group-hover:shadow-2xl transition-all duration-300 bg-white group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full rounded-full border-4 border-white shadow-xl bg-gradient-to-br ${getTypeColor(user.type)} flex items-center justify-center text-white font-bold" style="font-size: ${size/4}px">
                  ${user.name.slice(1, 3)}
                </div>
              `;
            }
          }}
        />

        {/* 影响力指示器 */}
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ zIndex: 25 }}
        >
          {user.influence}
        </motion.div>

        {/* 用户类型标识 */}
        <div
          className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
            user.type === '官方账号' ? 'bg-red-500 text-white' :
            user.type === '媒体账号' ? 'bg-blue-500 text-white' :
            user.type === 'KOL账号' ? 'bg-purple-500 text-white' :
            user.type === '粉丝团体' ? 'bg-pink-500 text-white' :
            'bg-gray-500 text-white'
          }`}
          style={{ zIndex: 25 }}
        >
          {user.type}
        </div>
      </div>

      {/* 悬浮信息卡片 */}
      <div
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/95 text-white rounded-lg p-4 whitespace-nowrap shadow-2xl border border-white/20"
        style={{ zIndex: 100 }}
      >
        <div className="font-bold text-base mb-2">{user.name}</div>
        <div className="text-sm text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>类型:</span>
            <span className="text-white">{user.type}</span>
          </div>
          <div className="flex justify-between">
            <span>粉丝:</span>
            <span className="text-blue-400">{user.followers}</span>
          </div>
          <div className="flex justify-between">
            <span>贴子:</span>
            <span className="text-green-400">{user.posts} 条</span>
          </div>
          <div className="flex justify-between">
            <span>互动率:</span>
            <span className="text-yellow-400">{user.engagement}</span>
          </div>
          <div className="flex justify-between">
            <span>影响力:</span>
            <span className="text-red-400 font-bold">{user.influence}/100</span>
          </div>
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/95"></div>
      </div>
    </motion.div>
  );
};

// 中心事件节点组件
export const CenterNode = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.5, type: "spring" }}
    className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-2xl border-4 border-white relative"
    style={{ zIndex: 25 }} // 中心节点z-index最高
  >
    {/* Handle - 作为源节点 */}
    <Handle
      type="source"
      position={Position.Right}
      style={{ background: '#555', border: '2px solid #fff' }}
    />

    <div className="text-center">
      <div className="text-base">热点</div>
      <div className="text-sm">事件</div>
    </div>

    {/* 多层脉冲效果 */}
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-400/50"
      animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
    />
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-300/30"
      animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
    />
  </motion.div>
);

// 将 nodeTypes 定义在组件外部以避免每次渲染时重新创建
export const nodeTypes = {
  userNode: UserNode,
  centerNode: CenterNode,
};

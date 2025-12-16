核心问题：在 flex 布局中，使用 h-full (height: 100%) 导致高度计算失败，滚动容器无法获得明确的高度，因此滚动条不会出现。

  修复前后对比

  修复前（失效）：
  <div className="flex-1 h-full relative group">
    <div className="w-full h-full overflow-y-auto reading-area px-16 py-8">
      {/* 内容 */}
    </div>
  </div>

  修复后（正常）：
  <div className="flex-1 relative group">
    <div className="absolute inset-0 overflow-y-auto reading-area px-16 py-8">
      {/* 内容 */}
    </div>
  </div>

  关键差异

  1. 外层容器：
    - ❌ 移除了 h-full
    - ✅ 保留 flex-1 relative group
  2. 内层滚动容器：
    - ❌ 从 w-full h-full
    - ✅ 改为 absolute inset-0

  技术原理

  1. h-full 在嵌套 flex 中的问题：
    - flex-1 会自动占据剩余空间，但高度是动态计算的
    - 子元素的 h-full 依赖父元素明确的高度值
    - 在复杂 flex 嵌套中，h-full 可能无法正确解析，导致高度为 0 或 auto
  2. absolute inset-0 的优势：
    - absolute 脱离文档流，相对于最近的 relative 父元素定位
    - inset-0 = top: 0; right: 0; bottom: 0; left: 0;
    - 直接基于父容器的实际渲染尺寸进行定位，不依赖百分比计算
    - 能准确获得父容器高度，即使父容器使用 flex-1
  3. 为什么左侧目录可以滚动：
  <div className="flex flex-col h-full">  <!-- 明确高度 -->
    <div className="flex-1 overflow-y-auto">  <!-- flex-1 + 滚动 -->
    - 父容器有明确的 h-full
    - flex-1 在 flex-col 中能正确计算剩余空间
    - 直接在该层应用 overflow-y-auto 生效

  最佳实践

  在 flex 布局中实现滚动区域：

  推荐方案（使用 absolute 定位）：
  <div className="flex-1 relative">
    <div className="absolute inset-0 overflow-y-auto">
      {/* 滚动内容 */}
    </div>
  </div>

  替代方案（flex 嵌套）：
  <div className="flex-1 flex flex-col">
    <div className="flex-1 overflow-y-auto">
      {/* 滚动内容 */}
    </div>
  </div>
#!/bin/bash

# 构建健康检查脚本
# 确保所有依赖包已正确构建，特别是TypeScript类型声明文件

echo "🔍 检查依赖包构建状态..."

# 检查所有包目录
for pkg_dir in packages/* apps/*; do
  if [ -f "$pkg_dir/package.json" ]; then
    pkg_name=$(basename "$pkg_dir")

    # 检查包是否有build脚本
    if ! grep -q '"build"' "$pkg_dir/package.json"; then
      echo "⏭️  $pkg_name 跳过（无build脚本）"
      continue
    fi

    # 检查构建产物（支持多种构建输出模式）
    if [ ! -f "$pkg_dir/dist/index.d.ts" ] || [ ! -f "$pkg_dir/dist/index.js" ]; then
      echo "⚠️  构建缺失: $pkg_name - 重新构建..."
      cd "$pkg_dir" && pnpm run build && cd -

      # 验证构建结果（支持多种构建输出模式）
      if [ -d "$pkg_dir/dist" ] && [ "$(ls -A "$pkg_dir/dist" 2>/dev/null)" ]; then
        echo "✅  $pkg_name 构建成功"
      else
        echo "❌  $pkg_name 构建失败"
        exit 1
      fi
    else
      echo "✅  $pkg_name 已构建"
    fi
  fi
done

echo "🎉 所有依赖包构建状态正常"
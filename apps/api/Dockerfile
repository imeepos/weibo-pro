# API 服务 Dockerfile
FROM node:20-alpine AS base

# 安装依赖
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# 先复制 package.json 和 pnpm-workspace.yaml
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# 安装 pnpm 并配置国内源
RUN npm install -g pnpm@9 --registry=https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com

# 安装依赖（使用 --ignore-scripts 避免在安装时执行脚本）
RUN pnpm install --frozen-lockfile --ignore-scripts

# 复制源代码
COPY packages packages
COPY apps apps

# 安装所有依赖（确保子包的依赖也被安装）
RUN pnpm install --frozen-lockfile

# 构建所有依赖包
RUN pnpm build:deps

# 构建应用
RUN pnpm build --filter=@sker/api

# 生产镜像
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# 复制构建产物
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/apps/api/package.json ./apps/api/

# 创建上传目录
RUN mkdir -p /app/uploads

# 暴露端口
EXPOSE 8089

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8089/health || exit 1

# 启动应用
CMD ["node", "dist/main.js"]

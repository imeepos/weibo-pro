# API 服务 Dockerfile
FROM node:20-alpine AS base

# 安装依赖
RUN apk add --no-cache libc6-compat

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY packages packages
COPY apps apps

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
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

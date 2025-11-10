FROM node:20-alpine AS builder

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/bigscreen/package.json ./apps/bigscreen/
COPY packages/ ./packages/

# 安装依赖
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY apps/bigscreen/ ./apps/bigscreen/

# 构建应用
RUN pnpm build

# 生产镜像
FROM nginx:alpine AS production

# 复制构建产物到nginx目录
COPY --from=builder /app/apps/bigscreen/dist /usr/share/nginx/html

# 复制nginx配置
COPY apps/bigscreen/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# nginx会自动启动
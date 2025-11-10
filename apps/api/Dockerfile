FROM node:20-alpine AS builder

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# 安装依赖
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY apps/api/ ./apps/api/

# 构建应用
RUN pnpm build

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# 安装pnpm并重新链接依赖
RUN npm install -g pnpm@latest
RUN pnpm install --prod --frozen-lockfile

# 复制环境变量
COPY .env ./

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]
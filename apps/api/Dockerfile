FROM node:20-alpine AS builder

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# 安装依赖
RUN npm install -g pnpm@latest
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY apps/api/ ./apps/api/

# 构建应用
RUN pnpm build

# 为生产环境准备依赖
RUN pnpm deploy --filter=@sker/api --prod ./deploy

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 复制构建产物和部署依赖
COPY --from=builder /app/deploy/dist ./dist
COPY --from=builder /app/deploy/node_modules ./node_modules

# 创建非root用户运行应用
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]
# 生产镜像
FROM nginx:alpine AS production

# 复制构建产物到nginx目录
COPY apps/bigscreen/dist /usr/share/nginx/html

# 复制nginx配置
COPY apps/bigscreen/nginx.conf /etc/nginx/conf.d/default.conf

# 创建非root用户
RUN addgroup -g 1001 -S nginxgroup
RUN adduser -S nginxuser -u 1001 -G nginxgroup
RUN chown -R nginxuser:nginxgroup /usr/share/nginx/html
RUN chown -R nginxuser:nginxgroup /var/cache/nginx
RUN chown -R nginxuser:nginxgroup /var/log/nginx
RUN chown -R nginxuser:nginxgroup /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginxuser:nginxgroup /var/run/nginx.pid

USER nginxuser

# 暴露端口
EXPOSE 80

# nginx会自动启动
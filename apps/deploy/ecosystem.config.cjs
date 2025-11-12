module.exports = {
  apps: [
    {
      name: 'weibo-webhook',
      script: './webhook-server.js',
      cwd: '/root/weibo-pro/apps/deploy',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env',
      error_file: '/root/weibo-pro/logs/webhook-error.log',
      out_file: '/root/weibo-pro/logs/webhook-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};

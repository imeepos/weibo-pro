module.exports = {
  apps: [
    {
      name: 'weibo-webhook',
      script: './webhook-server.js',
      cwd: '/home/weibo-pro/deploy',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      env_file: '.env.deploy',
      error_file: '/home/weibo-pro/logs/webhook-error.log',
      out_file: '/home/weibo-pro/logs/webhook-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};

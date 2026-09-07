/** PM2 process config for the Nest API on EC2. Run from repo root. */
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'dist/main.js',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

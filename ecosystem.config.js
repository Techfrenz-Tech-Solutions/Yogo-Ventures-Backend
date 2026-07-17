module.exports = {
  apps: [
    {
      name: "yogo-backend",
      script: "bin/www",
      watch: false,
      ignore_watch: [
        "node_modules",
        "node_modules/*",
        "logs/*",
        "storage",
        "storage/*"
      ],
      output: "logs/pm2/out.log",
      error: "logs/pm2/error.log",
      log: "logs/pm2/combined.outerr.log",
      env: {
        NODE_ENV: "production",
        PORT: 7002
      },
      env_local: {
        NODE_ENV: "local",
        PORT: 7001
      },
    },
  ],
};

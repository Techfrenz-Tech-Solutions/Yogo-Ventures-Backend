module.exports = {
  apps: [
    {
      name: "check",
      script: "bin/www",
      watch: true,
      ignore_watch: [
        "node_modules",
        "node_modules/*",
        "logs/*"
      ],
      output: "logs/pm2/out.log",
      error: "logs/pm2/error.log",
      log: "logs/pm2/combined.outerr.log",
      env: {
        NODE_ENV: "prod",
        PORT: 7002
      },
      env_local: {
        NODE_ENV: "local",
        PORT: 7001
      },
    },
  ],
};

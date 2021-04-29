module.exports = {
  apps : [
    {
      name: "vinteres",
      script: "./app/main.js",
      env: {
        NODE_ENV: "dev",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
}

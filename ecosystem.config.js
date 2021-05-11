module.exports = {
  apps : [
    {
      name: "vinteres",
      script: "./app/main.js",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      watch: ["app"],
      ignore_watch : ["node_modules"],
      watch_options: {
        "followSymlinks": false
      }
    }
  ]
}

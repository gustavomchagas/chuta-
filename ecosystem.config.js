module.exports = {
  apps: [
    {
      name: "chutai-bot",
      script: "/opt/chutai/src/bot.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      cwd: "/opt/chutai",
      max_memory_restart: "300M",
      env: {
        NODE_OPTIONS: "--max-old-space-size=256",
      },
    },
    {
      name: "chutai-admin",
      script: "/opt/chutai/src/admin.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      cwd: "/opt/chutai",
    },
  ],
};

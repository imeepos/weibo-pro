import { config } from "@sker/eslint-config/base.js";

export default [
  ...config,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      // 禁用turbo相关规则，本项目不使用turbo
      "turbo/no-undeclared-env-vars": "off",
    },
  },
];

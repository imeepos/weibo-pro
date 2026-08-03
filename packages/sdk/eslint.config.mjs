import { config } from "@sker/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // SDK 的 controller 是纯类型契约存根：方法体固定 throw new Error('not implements')，
    // 参数与部分 import 仅用于装饰器元数据/类型契约，属于有意“未使用”。
    files: ["src/controllers/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

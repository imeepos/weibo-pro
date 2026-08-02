import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import { config as baseConfig, relaxedRules } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "19.0.0" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    // 派生配置末尾重新应用 base 的规则放宽，
    // 避免被后引入的 recommended 配置覆盖。
    // 额外关闭：
    //  - react/prop-types：TS 已做 props 类型检查，无需 prop-types
    //  - react/use、react-hooks/refs、react-hooks/immutability、
    //    react-hooks/set-state-in-effect、react-hooks/exhaustive-deps、
    //    react-hooks/preserve-manual-memoization、react-hooks/purity、
    //    react-hooks/use-memo、react-hooks/static-components：
    //    react-hooks v7 / react 升级后新增或明显收紧的激进规则，既有代码不满足
    rules: {
      ...relaxedRules,
      "react/prop-types": "off",
      "react/use": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/static-components": "off",
      // react-hooks v7 升级后新增了对限定名 Hook（React.useMemo 等）在
      // 提前 return 之后的检测，既有组件大量使用该模式，不在此次 lint 任务中重构
      "react-hooks/rules-of-hooks": "off",
      // display name 仅用于调试，非必需
      "react/display-name": "off",
    },
  },
];

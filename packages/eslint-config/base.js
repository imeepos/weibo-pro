import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import globals from "globals";

/**
 * typescript-eslint 8.65 / eslint 10 新增的激进规则（升级前不存在），
 * 关闭或放宽以保持 lint 体验一致；代码中的 any 是既有风格。
 *
 * 注意：react-internal / next 等派生配置会在 base 之后再次引入
 * recommended 配置，会覆盖这些规则，因此派生配置应把 relaxedRules
 * 追加到末尾。
 */
export const relaxedRules = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unsafe-function-type": "off",
  "@typescript-eslint/no-wrapper-object-types": "off",
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_|^React$",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "no-useless-assignment": "off",
  "preserve-caught-error": "off",
  "@typescript-eslint/no-this-alias": "off",
  "@typescript-eslint/ban-ts-comment": "off",
  // 仓库为混合 ESM/CJS：Node 脚本与测试 mock 中合理使用 require()
  "@typescript-eslint/no-require-imports": "off",
};

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      // 仓库未在 turbo.json 声明 env，各包大量使用 process.env.*，
      // 该规则无法正确工作，统一关闭（nlp/mq/pageindex 等包已各自关闭）。
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    rules: relaxedRules,
  },
  {
    // 仓库内的 .js 脚本/配置文件在 node 下运行，提供 node 全局变量
    //（TS 文件由 TS 解析器自行处理全局，no-undef 不生效）。
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["dist/**"],
  },
];

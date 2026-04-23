import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.jquery,
        ...globals.commonjs,
        jQuery: "readonly",
        $: "readonly",
        Hxighlighter: "readonly",
        toastr: "readonly",
        Mirador: "readonly",
        _: "readonly",
        i18next: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": ["warn", "smart"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-var": "off",
      "prefer-const": "warn",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
  {
    files: ["webpack.config.js", "server.js", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["dist/", "coverage/", "node_modules/", "src/js/vendors/", "src/js/plugins/plugin-template.js"],
  },
];

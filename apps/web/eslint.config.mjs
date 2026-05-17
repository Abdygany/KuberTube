import config from "@kubertube/config/eslint";

export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];

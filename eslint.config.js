import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        ignores: ["node_modules/**", "dist/**", "BlueprintLibrary.mod.js", "mod_io_page/**", "tests/**"],
    },
    {
        files: ["src/**/*.js", "lib/**/*.js"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
                sourceType: "module",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "@typescript-eslint/no-unnecessary-condition": "error",
        },
    },
];

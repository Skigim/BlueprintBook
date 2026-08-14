import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        // .claude/worktrees/ holds linked git worktrees — full copies of this repo whose
        // files sit outside tsconfig's project, so linting them yields only parse errors.
        ignores: ["node_modules/**", "dist/**", "BlueprintLibrary.mod.js", "mod_io_page/**", "tests/**", ".claude/**"],
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

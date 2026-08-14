import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
    test: {
        // .claude/worktrees/ holds linked git worktrees — full copies of this repo,
        // tests included. Without this they are collected too and every test runs twice.
        exclude: [...configDefaults.exclude, ".claude/**"],
    },
});

# Changelog

All notable changes to the Blueprint Book mod will be documented in this file.

## [1.0.1] - 2026-07-17

### Added
- **Unit Testing Suite**: Integrated Vitest and jsdom for rapid, robust unit testing of the state management logic.
- **Test Coverage**: Added comprehensive test coverage for `BlueprintStore` covering blueprint addition, tag pruning, auto-incrementing IDs, and corrupt data recovery.
- **Documentation**: Added a `docs/` directory and initialized a persistent changelog.

### Changed
- **Modularization**: Completely refactored `BlueprintLibrary.mod.js` into an ES6 modular project structure. 
- **Build System**: Integrated `esbuild` for blazingly fast bundling of the modular source code back into a single deployable mod artifact.
- **Library Code Extraction**: Separated generic, reusable DOM and UI utility functions into a dedicated `lib/` directory to simplify development of future mods.

### Fixed
- Fixed edge cases related to empty blueprint names, Windows-style line endings (`\r\n`), and graceful degradation when parsing legacy or corrupted blueprint lists.

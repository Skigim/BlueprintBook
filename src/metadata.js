export const METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0.2",
    website: "",
    description: "A full rewrite of KiitikM's Blueprint Library mod. Features include: perfectly integrated native-style UI, custom tagging and filtering system, unified edit dialogs, and memory leak fixes.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    settings: {
        blueprints: [],
        nextBlueprintId: 1,
        availableTags: [],
        lastSeenVersion: "",
        skippedVersion: "",
    },
};

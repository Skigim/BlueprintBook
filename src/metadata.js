/**
 * Public listing for the mod. The in-game "VIEW ON MOD.IO" button must point here:
 * releases are distributed through mod.io, not through the GitHub repo the update
 * check reads version numbers from.
 */
export const MOD_IO_URL = "https://mod.io/g/shapez/m/blueprint-book#description";

export const METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0.4",
    website: "",
    description: "In-game blueprint book to save, organize, tag, filter, and preview blueprints.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    isDev: false,
    settings: {
        blueprints: [],
        nextBlueprintId: 1,
        availableTags: [],
        lastSeenVersion: "",
        skippedVersion: "",
        deletedValues: [],
        migrationChecked: false,
        updateChecksEnabled: true,
    },
};


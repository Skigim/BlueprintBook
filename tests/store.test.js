import { describe, it, expect, beforeEach } from 'vitest';
import { BlueprintStore } from '../src/store.js';

describe('BlueprintStore Logic', () => {
    let mockMod;

    beforeEach(() => {
        mockMod = {
            settings: {},
            saveSettings: () => {}
        };
        BlueprintStore.init(mockMod);
    });

    it('initializes with default values if settings are empty', () => {
        expect(mockMod.settings.blueprints).toEqual([]);
        expect(mockMod.settings.availableTags).toEqual([]);
        expect(mockMod.settings.nextBlueprintId).toBe(1);
    });

    it('cleans up orphaned tags on initialization', () => {
        mockMod.settings = {
            blueprints: [
                { id: 1, name: "BP1", tags: ["keep"] }
            ],
            availableTags: ["keep", "orphan"],
            nextBlueprintId: 2
        };
        BlueprintStore.init(mockMod);
        expect(mockMod.settings.availableTags).toEqual(["keep"]);
    });

    it('adds a new blueprint and auto-increments ID', () => {
        const entry = BlueprintStore.add("Test Base", "my-string-data", ["factory"]);
        
        expect(entry.id).toBe(1);
        expect(entry.name).toBe("Test Base");
        expect(entry.value).toBe("my-string-data");
        expect(entry.tags).toEqual(["factory"]);
        
        expect(mockMod.settings.nextBlueprintId).toBe(2);
        expect(mockMod.settings.blueprints).toHaveLength(1);
        expect(mockMod.settings.availableTags).toEqual(["factory"]);
    });

    it('updates a blueprint and prunes unused tags', () => {
        BlueprintStore.add("BP1", "string1", ["tag1", "tag2"]);
        expect(mockMod.settings.availableTags).toContain("tag1");
        
        // Update tags to only tag3
        BlueprintStore.update(1, { tags: ["tag3"] });
        
        expect(mockMod.settings.availableTags).toContain("tag3");
        expect(mockMod.settings.availableTags).not.toContain("tag1");
        expect(mockMod.settings.availableTags).not.toContain("tag2");
        
        const bp = BlueprintStore.getAll()[0];
        expect(bp.tags).toEqual(["tag3"]);
    });

    it('removes a blueprint and prunes tags', () => {
        BlueprintStore.add("BP1", "string1", ["tag1"]);
        expect(mockMod.settings.availableTags).toContain("tag1");
        
        const success = BlueprintStore.remove(1);
        expect(success).toBe(true);
        expect(mockMod.settings.blueprints).toHaveLength(0);
        expect(mockMod.settings.availableTags).not.toContain("tag1");
    });

    describe('Edge cases', () => {
        it('returns false when updating a non-existent blueprint', () => {
            expect(BlueprintStore.update(999, { name: "Ghost" })).toBe(false);
        });

        it('returns false when removing a non-existent blueprint', () => {
            expect(BlueprintStore.remove(999)).toBe(false);
        });

        it('handles adding a blueprint with an empty name', () => {
            const entry = BlueprintStore.add("   ", "my-string");
            expect(entry.name).toBe("Blueprint 1");
        });

        it('normalizes CRLF blueprint strings to LF', () => {
            const entry = BlueprintStore.add("Base", "line1\r\nline2\r\n   ");
            expect(entry.value).toBe("line1\nline2");
        });

        it('recovers corrupted settings on init', () => {
            mockMod.settings = {
                blueprints: "not-an-array", // Invalid blueprints
                nextBlueprintId: -50,       // Invalid counter
                availableTags: null         // Invalid tags
            };
            BlueprintStore.init(mockMod);
            
            expect(mockMod.settings.blueprints).toEqual([]);
            expect(mockMod.settings.nextBlueprintId).toBe(1);
            expect(mockMod.settings.availableTags).toEqual([]);
        });

        it('normalizes corrupted legacy blueprints on init', () => {
            mockMod.settings = {
                blueprints: [
                    null,
                    "invalid-string-bp",
                    { id: 5, tags: "not-an-array" }, // name and value missing, tags invalid
                    { name: "  Valid Name  ", value: "val" } // Missing ID
                ],
                nextBlueprintId: 10
            };
            BlueprintStore.init(mockMod);
            
            expect(mockMod.settings.blueprints).toHaveLength(2);
            
            const bp1 = mockMod.settings.blueprints[0];
            expect(bp1.id).toBe(5);
            expect(bp1.name).toBe("Blueprint 5"); // Fallback name
            expect(bp1.tags).toEqual([]);
            expect(bp1.value).toBe("");

            const bp2 = mockMod.settings.blueprints[1];
            expect(bp2.id).toBe(10); // Assigned from nextBlueprintId
            expect(bp2.name).toBe("Valid Name"); // Trimmed
            expect(bp2.value).toBe("val");
            
            // max ID is now 10, so nextBlueprintId should bump to 11
            expect(mockMod.settings.nextBlueprintId).toBe(11);
        });
    });
});

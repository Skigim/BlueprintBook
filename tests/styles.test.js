import { describe, it, expect } from 'vitest';
import { CSS } from '../src/styles.js';

describe('styles.js', () => {
    it('defines card dark theme background #474b58 and box-shadow', () => {
        expect(CSS).toMatch(/html\[data-theme="dark"\]\s+\.bplib-upgrade\s*\{[^}]*background:\s*#474b58;/);
    });

    it('defines circular shape canvas background #2e3440 and green amount pill #55c767', () => {
        expect(CSS).toMatch(/\.bplib-upgrade\s+\.requirement\s+\.shape\s*\{[^}]*background:\s*#2e3440;/);
        expect(CSS).toMatch(/\.bplib-upgrade\s+\.requirement\s+\.amount\s*\{[^}]*background:\s*#55c767;/);
    });
});

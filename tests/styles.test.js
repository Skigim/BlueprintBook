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

    it('defines preview dialog layout styles', () => {
        expect(CSS).toMatch(/\.bplib-preview-dialog-content\s*\{[^}]*flex:\s*1;/);
        expect(CSS).toMatch(/\.bplib-preview-canvas-container\s*\{[^}]*min-height:\s*360px;/);
        expect(CSS).toMatch(/\.bplib-preview-canvas-container canvas\s*\{[^}]*width:\s*100%/);
    });

    it('defines preview locked building warning style', () => {
        expect(CSS).toMatch(/\.bplib-preview-locked-warning\s*\{[^}]*color:\s*#ff9800;/);
    });

    it('defines preview recenter button CSS rules', () => {
        expect(CSS).toMatch(/\.bplib-preview-recenter-btn\s*\{[^}]*position:\s*absolute;/);
        expect(CSS).toMatch(/\.bplib-preview-recenter-btn\s*\{[^}]*top:\s*10px;/);
        expect(CSS).toMatch(/\.bplib-preview-recenter-btn\s*\{[^}]*right:\s*10px;/);
        expect(CSS).toMatch(/\.bplib-preview-recenter-btn\s*\{[^}]*z-index:\s*10;/);
        expect(CSS).toMatch(/\.bplib-preview-recenter-btn\s*\{[^}]*pointer-events:\s*auto;/);
    });

    it('defines disabled styled button CSS rules with opacity and cursor not-allowed', () => {
        expect(CSS).toMatch(/\.button\.styledButton\.disabled,?\s*button\.styledButton:disabled,?\s*button\.styledButton\.disabled\s*\{[^}]*opacity:\s*0\.4\s*!important;/);
        expect(CSS).toMatch(/\.button\.styledButton\.disabled,?\s*button\.styledButton:disabled,?\s*button\.styledButton\.disabled\s*\{[^}]*cursor:\s*not-allowed\s*!important;/);
    });
});



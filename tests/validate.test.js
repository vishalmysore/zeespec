import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const PLACEHOLDER_PATTERNS = [
    /\[Replace this with your own description\]/i,
    /\[Your description here\]/i,
    /\[TODO\]/i,
    /\[FILL IN\]/i,
];

function hasPlaceholder(content) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(content)) {
            return true;
        }
    }
    return false;
}

function validateSpecContent(content) {
    if (!content || content.trim().length === 0) {
        return { valid: false, reason: 'empty' };
    }
    if (hasPlaceholder(content)) {
        return { valid: false, reason: 'placeholder' };
    }
    return { valid: true };
}

describe('Validation Logic', () => {
    describe('hasPlaceholder', () => {
        it('should detect "[Replace this with your own description]"', () => {
            const content = 'Some text [Replace this with your own description] more text';
            expect(hasPlaceholder(content)).toBe(true);
        });

        it('should detect "[TODO]"', () => {
            const content = '[TODO] implement this';
            expect(hasPlaceholder(content)).toBe(true);
        });

        it('should detect "[FILL IN]"', () => {
            const content = 'Please [FILL IN] the details';
            expect(hasPlaceholder(content)).toBe(true);
        });

        it('should be case-insensitive', () => {
            const content = '[replace this with your own description]';
            expect(hasPlaceholder(content)).toBe(true);
        });

        it('should return false for real content', () => {
            const content = 'This is a real system description with actual details about what it does.';
            expect(hasPlaceholder(content)).toBe(false);
        });
    });

    describe('validateSpecContent', () => {
        it('should mark empty content as invalid', () => {
            expect(validateSpecContent('')).toEqual({ valid: false, reason: 'empty' });
            expect(validateSpecContent('   ')).toEqual({ valid: false, reason: 'empty' });
        });

        it('should mark placeholder content as invalid', () => {
            const result = validateSpecContent('# Title\n[Replace this with your own description]');
            expect(result).toEqual({ valid: false, reason: 'placeholder' });
        });

        it('should mark real content as valid', () => {
            const content = `
# WHAT — System Description
This is a library management system. It tracks books, members, and loans.
Books have titles, authors, and availability status.
            `;
            expect(validateSpecContent(content)).toEqual({ valid: true });
        });
    });
});

describe('Spec File Validation', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `spec-validate-test-${Date.now()}`);
        await fs.ensureDir(tempDir);
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    it('should identify missing spec files', async () => {
        const files = ['what.md', 'how.md'];
        for (const file of files) {
            await fs.writeFile(path.join(tempDir, file), 'Content');
        }

        const exists = await fs.pathExists(path.join(tempDir, 'who.md'));
        expect(exists).toBe(false);
    });

    it('should read and validate spec file content', async () => {
        await fs.writeFile(path.join(tempDir, 'what.md'), 'Real system description');

        const content = await fs.readFile(path.join(tempDir, 'what.md'), 'utf8');
        const result = validateSpecContent(content);

        expect(result.valid).toBe(true);
    });
});

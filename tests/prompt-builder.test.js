import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { buildMasterPrompt } from '../src/prompt-builder.js';

describe('buildMasterPrompt', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `spec-test-${Date.now()}`);
        await fs.ensureDir(tempDir);
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    it('should build a master prompt from spec files', async () => {
        await fs.writeFile(path.join(tempDir, 'what.md'), 'This is a test system.');
        await fs.writeFile(path.join(tempDir, 'how.md'), 'Built with Node.js.');

        const result = await buildMasterPrompt(tempDir);

        expect(result).toContain('SYSTEM SPECIFICATION OVERVIEW');
        expect(result).toContain('DIMENSION: WHAT');
        expect(result).toContain('This is a test system.');
        expect(result).toContain('DIMENSION: HOW');
        expect(result).toContain('Built with Node.js.');
        expect(result).toContain('INSTRUCTIONS FOR THE AI AGENT');
    });

    it('should skip missing files without error', async () => {
        await fs.writeFile(path.join(tempDir, 'what.md'), 'Only what exists.');

        const result = await buildMasterPrompt(tempDir);

        expect(result).toContain('DIMENSION: WHAT');
        expect(result).toContain('Only what exists.');
        expect(result).not.toContain('DIMENSION: HOW');
    });

    it('should include all 8 dimensions when present', async () => {
        const dimensions = ['what', 'how', 'who', 'when', 'where', 'why', 'upstream', 'downstream'];
        for (const dim of dimensions) {
            await fs.writeFile(path.join(tempDir, `${dim}.md`), `Content for ${dim}`);
        }

        const result = await buildMasterPrompt(tempDir);

        for (const dim of dimensions) {
            expect(result).toContain(`DIMENSION: ${dim.toUpperCase()}`);
            expect(result).toContain(`Content for ${dim}`);
        }
    });

    it('should handle empty spec directory', async () => {
        const result = await buildMasterPrompt(tempDir);

        expect(result).toContain('SYSTEM SPECIFICATION OVERVIEW');
        expect(result).toContain('INSTRUCTIONS FOR THE AI AGENT');
    });
});

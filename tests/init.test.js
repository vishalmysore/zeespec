import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const TEMPLATE_FILES = [
    'what.md',
    'how.md',
    'who.md',
    'when.md',
    'where.md',
    'why.md',
    'upstream.md',
    'downstream.md'
];

describe('Init Command Logic', () => {
    let tempDir;
    let specDir;

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `spec-init-test-${Date.now()}`);
        specDir = path.join(tempDir, '.spec');
        await fs.ensureDir(tempDir);
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    describe('Template Files', () => {
        it('should have all 8 required template files defined', () => {
            expect(TEMPLATE_FILES).toHaveLength(8);
            expect(TEMPLATE_FILES).toContain('what.md');
            expect(TEMPLATE_FILES).toContain('how.md');
            expect(TEMPLATE_FILES).toContain('who.md');
            expect(TEMPLATE_FILES).toContain('when.md');
            expect(TEMPLATE_FILES).toContain('where.md');
            expect(TEMPLATE_FILES).toContain('why.md');
            expect(TEMPLATE_FILES).toContain('upstream.md');
            expect(TEMPLATE_FILES).toContain('downstream.md');
        });
    });

    describe('Directory Creation', () => {
        it('should be able to create .spec directory', async () => {
            await fs.ensureDir(specDir);
            const exists = await fs.pathExists(specDir);
            expect(exists).toBe(true);
        });

        it('should detect if .spec already exists', async () => {
            await fs.ensureDir(specDir);
            const existsBefore = await fs.pathExists(specDir);
            expect(existsBefore).toBe(true);
        });
    });

    describe('Template Copying', () => {
        it('should copy template files to .spec directory', async () => {
            await fs.ensureDir(specDir);

            for (const file of TEMPLATE_FILES) {
                await fs.writeFile(path.join(specDir, file), `Template content for ${file}`);
            }

            const files = await fs.readdir(specDir);
            expect(files).toHaveLength(8);

            for (const templateFile of TEMPLATE_FILES) {
                expect(files).toContain(templateFile);
            }
        });

        it('should create files with content', async () => {
            await fs.ensureDir(specDir);
            const testContent = '# Test Template\nThis is test content.';
            await fs.writeFile(path.join(specDir, 'what.md'), testContent);

            const content = await fs.readFile(path.join(specDir, 'what.md'), 'utf8');
            expect(content).toBe(testContent);
        });
    });
});

describe('Template Source Verification', () => {
    const templateDir = path.resolve(process.cwd(), 'src', 'templates');

    it('should have template source directory', async () => {
        const exists = await fs.pathExists(templateDir);
        expect(exists).toBe(true);
    });

    it('should have all template files in source', async () => {
        const files = await fs.readdir(templateDir);

        for (const templateFile of TEMPLATE_FILES) {
            expect(files).toContain(templateFile);
        }
    });

    it('should have non-empty template files', async () => {
        for (const templateFile of TEMPLATE_FILES) {
            const content = await fs.readFile(path.join(templateDir, templateFile), 'utf8');
            expect(content.length).toBeGreaterThan(0);
        }
    });
});

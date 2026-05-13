import { describe, it, expect } from 'vitest';

const PLACEHOLDER_PATTERNS = [
    /\[Replace this with your own description\]/i,
    /\[Your description here\]/i,
    /\[TODO\]/i,
    /\[FILL IN\]/i,
];

function countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

function hasPlaceholder(content) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(content)) {
            return true;
        }
    }
    return false;
}

function getFileStatus(content) {
    if (!content || content.trim().length === 0) {
        return 'empty';
    }
    if (hasPlaceholder(content)) {
        return 'incomplete';
    }
    return 'complete';
}

describe('Status Logic', () => {
    describe('countWords', () => {
        it('should count words correctly', () => {
            expect(countWords('one two three')).toBe(3);
            expect(countWords('hello world')).toBe(2);
            expect(countWords('single')).toBe(1);
        });

        it('should handle multiple spaces', () => {
            expect(countWords('one   two    three')).toBe(3);
        });

        it('should handle newlines and tabs', () => {
            expect(countWords('one\ntwo\tthree')).toBe(3);
        });

        it('should return 0 for empty string', () => {
            expect(countWords('')).toBe(0);
            expect(countWords('   ')).toBe(0);
        });

        it('should count words in real spec content', () => {
            const content = `
# WHAT — System Description

This is a library management system where users can check out and return books.
The main things in this system are Books, Members, and Loans.
            `;
            const count = countWords(content);
            expect(count).toBeGreaterThan(20);
        });
    });

    describe('getFileStatus', () => {
        it('should return "empty" for empty content', () => {
            expect(getFileStatus('')).toBe('empty');
            expect(getFileStatus('   ')).toBe('empty');
            expect(getFileStatus(null)).toBe('empty');
        });

        it('should return "incomplete" for placeholder content', () => {
            expect(getFileStatus('[Replace this with your own description]')).toBe('incomplete');
            expect(getFileStatus('Title\n[TODO]')).toBe('incomplete');
        });

        it('should return "complete" for real content', () => {
            const content = 'This is a real system. It manages books and members.';
            expect(getFileStatus(content)).toBe('complete');
        });
    });
});

describe('Progress Calculation', () => {
    function calculateProgress(completed, total) {
        return Math.round((completed / total) * 100);
    }

    it('should calculate 0% for no completion', () => {
        expect(calculateProgress(0, 8)).toBe(0);
    });

    it('should calculate 100% for full completion', () => {
        expect(calculateProgress(8, 8)).toBe(100);
    });

    it('should calculate 50% for half completion', () => {
        expect(calculateProgress(4, 8)).toBe(50);
    });

    it('should round percentages', () => {
        expect(calculateProgress(3, 8)).toBe(38);
        expect(calculateProgress(5, 8)).toBe(63);
    });
});

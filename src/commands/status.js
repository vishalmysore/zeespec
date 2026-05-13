import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const PLACEHOLDER_PATTERNS = [
    /\[Replace this with your own description\]/i,
    /\[Your description here\]/i,
    /\[TODO\]/i,
    /\[FILL IN\]/i,
];

const SPEC_FILES = [
    { name: 'what.md', dimension: 'WHAT', description: 'What the system is' },
    { name: 'how.md', dimension: 'HOW', description: 'How it should be built' },
    { name: 'who.md', dimension: 'WHO', description: 'Who uses it' },
    { name: 'when.md', dimension: 'WHEN', description: 'When things happen' },
    { name: 'where.md', dimension: 'WHERE', description: 'Where it lives' },
    { name: 'why.md', dimension: 'WHY', description: 'Why it exists' },
    { name: 'upstream.md', dimension: 'UPSTREAM', description: 'What it receives' },
    { name: 'downstream.md', dimension: 'DOWNSTREAM', description: 'What it sends' }
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

export async function statusCommand() {
    const specDir = path.join(process.cwd(), '.spec');

    try {
        if (!(await fs.pathExists(specDir))) {
            console.error(chalk.red(`Error: The .spec directory was not found. Did you run 'spec init' first?`));
            process.exit(1);
        }

        console.log(chalk.blue.bold(`\n📋 Spec Status Report\n`));
        console.log(chalk.dim(`─`.repeat(60)));

        let completed = 0;
        let incomplete = 0;
        let missing = 0;
        let totalWords = 0;

        for (const spec of SPEC_FILES) {
            const filePath = path.join(specDir, spec.name);

            if (!(await fs.pathExists(filePath))) {
                console.log(`${chalk.red('✗')} ${chalk.bold(spec.dimension.padEnd(12))} ${chalk.red('Missing')}`);
                missing++;
                continue;
            }

            const content = await fs.readFile(filePath, 'utf8');
            const words = countWords(content);
            totalWords += words;

            if (content.trim().length === 0) {
                console.log(`${chalk.red('✗')} ${chalk.bold(spec.dimension.padEnd(12))} ${chalk.red('Empty')}`);
                missing++;
            } else if (hasPlaceholder(content)) {
                console.log(`${chalk.yellow('○')} ${chalk.bold(spec.dimension.padEnd(12))} ${chalk.yellow('Has placeholders')} ${chalk.dim(`(${words} words)`)}`);
                incomplete++;
            } else {
                console.log(`${chalk.green('●')} ${chalk.bold(spec.dimension.padEnd(12))} ${chalk.green('Complete')} ${chalk.dim(`(${words} words)`)}`);
                completed++;
            }
        }

        console.log(chalk.dim(`─`.repeat(60)));

        const total = SPEC_FILES.length;
        const percentage = Math.round((completed / total) * 100);

        console.log(`\n${chalk.bold('Summary:')}`);
        console.log(`  ${chalk.green('●')} Complete:   ${completed}/${total}`);
        console.log(`  ${chalk.yellow('○')} Incomplete: ${incomplete}/${total}`);
        console.log(`  ${chalk.red('✗')} Missing:    ${missing}/${total}`);
        console.log(`  ${chalk.blue('📝')} Total words: ${totalWords}`);

        const progressBar = createProgressBar(percentage, 20);
        console.log(`\n  Progress: ${progressBar} ${percentage}%\n`);

        if (completed === total) {
            console.log(chalk.green.bold(`🎉 All specs complete! Run 'spec generate' to build your prompt.\n`));
        } else {
            console.log(chalk.blue(`Tip: Fill in the remaining specs, then run 'spec generate'.\n`));
        }

    } catch (error) {
        console.error(chalk.red(`Error checking status: ${error.message}`));
        process.exit(1);
    }
}

function createProgressBar(percentage, width) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

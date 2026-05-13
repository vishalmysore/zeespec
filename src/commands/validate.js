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
    'what.md',
    'how.md',
    'who.md',
    'when.md',
    'where.md',
    'why.md',
    'upstream.md',
    'downstream.md'
];

export async function validateCommand() {
    const specDir = path.join(process.cwd(), '.spec');

    try {
        if (!(await fs.pathExists(specDir))) {
            console.error(chalk.red(`Error: The .spec directory was not found. Did you run 'spec init' first?`));
            process.exit(1);
        }

        console.log(chalk.blue(`Validating specifications in ${specDir}...\n`));

        let hasErrors = false;
        let hasWarnings = false;
        const results = [];

        for (const fileName of SPEC_FILES) {
            const filePath = path.join(specDir, fileName);
            const dimension = fileName.replace('.md', '').toUpperCase();

            if (!(await fs.pathExists(filePath))) {
                results.push({
                    file: fileName,
                    status: 'missing',
                    message: `Missing file`
                });
                hasErrors = true;
                continue;
            }

            const content = await fs.readFile(filePath, 'utf8');

            if (content.trim().length === 0) {
                results.push({
                    file: fileName,
                    status: 'empty',
                    message: `File is empty`
                });
                hasErrors = true;
                continue;
            }

            const foundPlaceholders = [];
            for (const pattern of PLACEHOLDER_PATTERNS) {
                if (pattern.test(content)) {
                    foundPlaceholders.push(pattern.source);
                }
            }

            if (foundPlaceholders.length > 0) {
                results.push({
                    file: fileName,
                    status: 'incomplete',
                    message: `Contains placeholder text`
                });
                hasWarnings = true;
            } else {
                results.push({
                    file: fileName,
                    status: 'valid',
                    message: `Looks good`
                });
            }
        }

        for (const result of results) {
            const icon = result.status === 'valid' ? chalk.green('✓') :
                         result.status === 'incomplete' ? chalk.yellow('!') :
                         chalk.red('✗');
            const statusColor = result.status === 'valid' ? chalk.green :
                               result.status === 'incomplete' ? chalk.yellow :
                               chalk.red;
            console.log(`${icon} ${chalk.bold(result.file.padEnd(15))} ${statusColor(result.message)}`);
        }

        console.log('');

        if (hasErrors) {
            console.log(chalk.red(`Validation failed: Some spec files are missing or empty.`));
            process.exit(1);
        } else if (hasWarnings) {
            console.log(chalk.yellow(`Validation warning: Some spec files still contain placeholder text.`));
            console.log(chalk.blue(`Tip: Replace placeholder text with your actual system description.\n`));
            process.exit(0);
        } else {
            console.log(chalk.green(`All spec files are valid and complete!`));
            process.exit(0);
        }

    } catch (error) {
        console.error(chalk.red(`Error during validation: ${error.message}`));
        process.exit(1);
    }
}

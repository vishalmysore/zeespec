#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { generateCommand } from '../src/commands/generate.js';
import { validateCommand } from '../src/commands/validate.js';
import { statusCommand } from '../src/commands/status.js';

program
    .name('spec')
    .description('System-First Spec: Turn plain English descriptions into full technical specifications.')
    .version('1.0.0');

program
    .command('init')
    .description('Scaffold the .spec/ folder with template files.')
    .action(initCommand);

program
    .command('generate')
    .description('Assemble .spec files into a master prompt (AGENTS.md and clipboard).')
    .action(generateCommand);

program
    .command('validate')
    .description('Check if spec files are complete (no placeholders).')
    .action(validateCommand);

program
    .command('status')
    .description('Show completion status of each spec file.')
    .action(statusCommand);

program.parse(process.argv);

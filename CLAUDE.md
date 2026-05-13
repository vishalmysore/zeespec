# ZeeSpec (spec-cli)

A CLI tool for creating structured system specifications for AI agents using the 5W1H methodology.

## Project Structure

```
zeespec/
├── bin/spec.js          # CLI entry point
├── src/
│   ├── commands/        # CLI commands (init, generate, validate, status)
│   ├── templates/       # Template files for .spec/ folder
│   └── prompt-builder.js # Assembles specs into master prompt
├── docs/                # GitHub Pages site
├── .spec/               # Example spec files
└── tests/               # Test files
```

## Commands

- `spec init` - Scaffold `.spec/` folder with templates
- `spec generate` - Build master prompt from specs → AGENTS.md + clipboard
- `spec validate` - Check if spec files are complete (no placeholders)
- `spec status` - Show completion status of each spec file

## Development

```bash
npm install
npm test        # Run tests
npm run lint    # Check code style (if configured)
```

## Key Files

- `src/prompt-builder.js` - Core logic for assembling the master prompt
- `src/commands/init.js` - Copies templates to `.spec/`
- `src/commands/generate.js` - Reads specs and outputs AGENTS.md
- `src/templates/*.md` - 8 dimension templates (what, how, who, when, where, why, upstream, downstream)

## Architecture

1. User runs `spec init` → templates copied to `.spec/`
2. User fills in `.spec/*.md` files with their system description
3. User runs `spec generate` → all specs assembled into `AGENTS.md`
4. User pastes prompt into AI agent (Cursor, Claude Code, etc.)

## Testing

Tests use Vitest and cover:
- Template initialization
- Prompt generation
- Validation logic
- Status reporting

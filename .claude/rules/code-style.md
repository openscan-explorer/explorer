# Code Style and Quality

## Formatting and Linting

- **Biome** for formatting and linting (config: `biome.json`)
  - Line width: 100 characters
  - Indentation: 2 spaces
  - Scope: `src/**/*.ts`, `src/**/*.tsx`, `src/**/*.json` (excludes CSS files)
  - Enabled rules: All recommended Biome linting rules
  - Use `npm run format:fix` to auto-format code before committing
  - Use `npm run lint:fix` to auto-fix linting issues (max 1024 diagnostics shown)

## TypeScript

- **Strict mode** enabled (`noImplicitAny`, `noImplicitReturns`, `noUncheckedIndexedAccess`)
- All TypeScript code must pass type checking with zero errors

## React

- **React 19** with functional components and hooks
- No class components

## Internationalization (i18n)

- **NEVER hardcode user-facing strings** - All text visible to users must use the i18n system
- Use `useTranslation()` hook from react-i18next in all components with user-facing text
- See @.claude/rules/i18n.md for complete guidelines on:
  - Choosing the right namespace
  - Adding new translation keys
  - Variable interpolation and pluralization
  - Supporting new languages

## CSS

- All styles should be in `src/styles` folder
- Avoid using inline component styles
- Use CSS variables for theming (defined in `src/theme.tsx`)

## Code Quality Requirements

- All code must pass Biome formatting and linting checks
- All TypeScript code must pass type checking with zero errors
- Follow the 100-character line width limit
- Use 2-space indentation consistently
- Adhere to Biome's recommended linting rules
- Keep documentation up to date

## Before Committing Code

ALWAYS run these commands before committing:

```bash
# 1. Fix formatting issues
npm run format:fix

# 2. Fix linting issues
npm run lint:fix

# 3. Verify type safety
npm run typecheck

# 4. Verify i18n compliance
# - Ensure no hardcoded user-facing strings
# - Test in both English and Spanish if you added translations

# 5. Run tests (if applicable)
npm run test:run
```

## When Modifying Files

- Run `npm run format:fix` and `npm run lint:fix` after making changes
- Address any remaining linting warnings that cannot be auto-fixed
- Ensure TypeScript compilation succeeds with `npm run typecheck`
- Do not commit code with formatting, linting, or type errors

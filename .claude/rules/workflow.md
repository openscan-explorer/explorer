# Git Workflow and Collaboration

## Branch Strategy

The project follows a structured branching workflow:

```
feature/fix/refactor branches → release branch (vX.Y.Z) → dev (staging/QA) → main (production)
```

### Branch Types

1. **Feature/Fix/Refactor Branches**: Created from the **release branch** for specific changes
   - Naming: `feat/<description>`, `fix/<description>`, `refactor/<description>`
   - Example: `feat/token-holdings`, `fix/light-theme-colors`, `refactor/address-layout`
   - PRs are created against the release branch

2. **Release Branches**: Created for each release cycle
   - Naming: `release/vX.Y.Z` (e.g., `release/v1.1.1`)
   - All feature branches are merged here
   - When features are complete, merged to `dev` for QA/staging

3. **Dev Branch**: Staging/QA environment
   - Receives merges from release branches
   - Used for QA testing before production
   - If fixes are needed during QA, PRs can be created directly against `dev`

4. **Main Branch**: Production-ready code
   - Only receives merges from `dev` after QA approval
   - Always stable and deployable

### Workflow Steps

1. Create or checkout the release branch:
   ```bash
   git checkout release/v1.1.1
   git pull origin release/v1.1.1
   ```

2. Create feature branch from the release branch:
   ```bash
   git checkout -b feat/my-feature
   ```

3. Work on feature, commit changes following conventional commits

4. Push and create PR to the **release branch**:
   ```bash
   git push -u origin feat/my-feature
   gh pr create --base release/v1.1.1
   ```

5. After PR approval and merge to release branch, delete feature branch

6. When release is ready for QA, merge release branch to `dev`:
   ```bash
   git checkout dev
   git merge release/v1.1.1
   git push origin dev
   ```

7. **QA/Staging fixes**: If issues are found during QA, create PRs directly against `dev`:
   ```bash
   git checkout dev
   git checkout -b fix/qa-issue
   # ... fix the issue ...
   gh pr create --base dev
   ```

8. After QA approval, merge `dev` to `main`:
   ```bash
   git checkout main
   git merge dev
   git tag v1.1.1
   git push origin main --tags
   ```

## Commit Convention

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples
```
feat(address): add token holdings display
fix(theme): improve light theme contrast
refactor(components): reorganize address page layout
docs(readme): update installation instructions
```

## Pull Request Template

When creating PRs, follow the template at `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description
<!-- Brief description of the changes in this PR -->

## Related Issue
<!-- Link to the related issue (e.g., Closes #123) -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement
- [ ] Other (please describe):

## Changes Made
<!-- List the main changes made in this PR -->

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Checklist
- [ ] I have run `npm run format:fix` and `npm run lint:fix`
- [ ] I have run `npm run typecheck` with no errors
- [ ] I have run tests with `npm run test:run`
- [ ] I have tested my changes locally
- [ ] I have updated documentation if needed
- [ ] My code follows the project's architecture patterns

## Additional Notes
<!-- Any additional information that reviewers should know -->
```

## Issue Templates

### Bug Report (`.github/ISSUE_TEMPLATE/bug_report.md`)

```markdown
---
name: Bug Report
about: Report a bug or unexpected behavior
title: "[BUG] "
labels: bug
---

## Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- **Browser**: [e.g., Chrome 120, Firefox 121]
- **OS**: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- **Network**: [e.g., Ethereum Mainnet, Arbitrum, Localhost]

## Additional Context
Add any other context about the problem here.
```

### Feature Request (`.github/ISSUE_TEMPLATE/feature_request.md`)

```markdown
---
name: Feature Request
about: Suggest a new feature or enhancement
title: "feat: "
labels: enhancement
---

## Summary
A clear and concise description of the feature you'd like to see.

## Motivation
Why is this feature needed? What problem does it solve?

## Proposed Solution
Describe how you envision this feature working.

## Alternatives Considered
Any alternative solutions or features you've considered.

## Additional Context
Add any other context, mockups, or screenshots about the feature request.

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3
```

### General Issue (`.github/ISSUE_TEMPLATE/general_issue.md`)

```markdown
---
name: General Issue
about: For questions, discussions, or issues that don't fit other templates
title: ""
---

## Description
Describe your issue, question, or topic for discussion.

## Context
Provide any relevant context or background information.

## Expected Outcome
What outcome or resolution are you looking for?

## Additional Information
Any other details that might be helpful.
```

## Creating PRs with Claude

When asked to create a PR:
1. Always use the PR template structure above
2. Fill in all sections appropriately
3. Check the applicable boxes in "Type of Change"
4. Mark completed items in the checklist
5. Link related issues with "Closes #XXX" or "Fixes #XXX"

## Creating Issues with Claude

When asked to create an issue:
1. Choose the appropriate template:
   - **Bug Report** (`[BUG]` prefix) - For bugs and unexpected behavior
   - **Feature Request** (`feat:` prefix) - For new features and enhancements
   - **General Issue** - For questions, discussions, or other topics
2. Fill in all sections with relevant details
3. Add appropriate labels (`bug`, `enhancement`, etc.)
4. Include reproduction steps for bugs
5. Include acceptance criteria for feature requests

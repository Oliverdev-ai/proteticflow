🤝 Contributing to ProteticFlow
Branch Strategy

main → Stable production-ready

dev → Active development

Feature branches → feature/<feature-name>

Example:

feature/dashboard-summary
Commit Standard

Use Conventional Commits:

feat: New feature

fix: Bug fix

refactor: Code restructuring

docs: Documentation

chore: Maintenance

Example:

feat: add dashboard summary endpoint
Pull Request Rules

Must target dev

Must describe purpose clearly

Must not break API contract

Must respect architecture rules

Code Rules

Respect modular structure

No hardcoded secrets

No direct SQL unless justified

Always use CustomUser
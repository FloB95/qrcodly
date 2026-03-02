# Contributing to QRcodly

Thank you for considering contributing to QRcodly! We welcome contributions from the community to make this project better.

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.11
- [pnpm](https://pnpm.io/) >= 9.15
- [Docker](https://www.docker.com/) for local services

### Getting Started

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/qrcodly.git
cd qrcodly

# 2. Install dependencies
pnpm install

# 3. Start local services (MySQL, Redis, MinIO, Umami)
docker-compose up -d

# 4. Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit both .env files with your configuration

# 5. Start development servers
pnpm run start:dev
# Backend API → http://localhost:5001
# Frontend   → http://localhost:3000
```

For architecture details, see the per-app READMEs:
[Backend](apps/backend/README.md) ·
[Frontend](apps/frontend/README.md) ·
[Browser Extension](apps/browser-extension/README.md) ·
[Shared Package](packages/shared/README.md)

## How to Contribute

### Report Issues

If you find a bug, have a feature request, or encounter any problem while using QRcodly, please [create an issue](https://github.com/FloB95/qrcodly/issues) on GitHub.

### Suggest Features

We are open to new ideas! If you have a feature suggestion, create an issue and use the `enhancement` label. Please provide as much detail as possible to help us understand your idea.

### Submit Pull Requests

1. Fork the repository and clone it locally.
2. Create a branch for your changes: `git checkout -b feature-name`.
3. Make your changes and commit them: `git commit -m "Description of your changes"`.
4. Push the branch to your fork: `git push origin feature-name`.
5. Open a pull request on the original repository.

Before submitting a PR, run the pre-check to make sure everything passes:

```bash
pnpm run pr:precheck   # lint + typecheck + test + build
```

### Code Style and Standards

Please ensure your code follows these guidelines:

- Use TypeScript and adhere to the existing code style.
- Include comments and documentation where appropriate.
- Write tests for new features and bug fixes.
- Run `pnpm run format` to format your code with Prettier before committing.

### Communication

If you are unsure about any part of the contribution process, feel free to reach out by opening an issue or starting a discussion on GitHub.

You can also contact me on Discord (xflomo)

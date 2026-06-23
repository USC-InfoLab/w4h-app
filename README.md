# W4H Web App

The [Wearables for Health (W4H) Toolkit](https://infolab.usc.edu/projects/W4H/) is a suite of open-source tools for managing, analyzing, and visualizing wearable data used in health applications. This repository provides the [W4H Web App](https://github.com/USC-InfoLab/w4h-app), the primary interface for setting up the toolkit and managing workflows.

---

## 📋 Prerequisites

Ensure you have Postgres 16.14 or later installed:

- **PostgreSQL:** [Postgres Docker Image](https://hub.docker.com/_/postgres) or [Postgres.app](https://postgresapp.com/) (Mac)
- **Management:** [pgAdmin](https://www.pgadmin.org/) is recommended for managing the instance.

## 🛠️ Development Setup

This project is built with **Vue 3** and **Vite**. To run the front-end you will need the following dependencies:

- [w4h-api](https://github.com/USC-InfoLab/w4h-api) services
- [w4h-docs](https://github.com/USC-InfoLab/w4h-docs) documentation
- [w4h-notebooks](https://github.com/USC-InfoLab/w4h-notebooks) Python and R notebooks
- [w4h-datasets](https://github.com/USC-InfoLab/w4h-datasets) sample datasets

### Recommended IDE Setup

- **Editor:** [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
- **Browser Tools:** Install [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) and [enable Custom Object Formatters](http://bit.ly/object-formatters).

### Project Scripts

````bash
# Install dependencies
npm install

# Create .env from .env.example and configure
cp .env.example .env
# To avoid re-entering credentials set VITE_APP_ADMIN_EMAIL, VITE_APP_ADMIN_PASSWORD

# Compile and Hot-Reload for development
npm run dev

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint

### End-to-End Testing (Playwright)

To ensure stability across different browsers, use the following commands:

```bash
# Install browser binaries (first run only)
npx playwright install

# When testing on CI, must build the project first
npm run build

# Run all end-to-end tests
npm run test:e2e

# Run tests only on Chromium
npm run test:e2e -- --project=chromium

# Run tests for a specific file
npm run test:e2e -- tests/example.spec.ts

# Run tests in debug mode (headed mode)
npm run test:e2e -- --debug


#### Linting

To maintain code quality and follow the project's style guidelines:

```bash
# Run ESLint to find and fix code style issues
npm run lint
````

## 🔗 Resources

- **Official Project Website:** [W4H Project Page](https://infolab.usc.edu/projects/W4H/)
- **Vite Configuration:** [Vite Configuration Reference](https://vite.dev/config/)
- **Vue 3 Documentation:** [vuejs.org](https://vuejs.org/)
- **Official Project Website:** [W4H Project Page](https://infolab.usc.edu/projects/W4H/)

- **Vite Configuration:** [Vite Configuration Reference](https://vite.dev/config/)
- **Vue 3 Documentation:** [vuejs.org](https://vuejs.org/)
- **Playwright Docs:** [playwright.dev](https://playwright.dev/)

---

## 🚀 Quick Start (Docker)

The fastest way to install the W4H Toolkit is using the W4H Docker component.

### 1. Prerequisites

Ensure you have the following installed:

- **Docker:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL:** [Postgres Docker Image](https://hub.docker.com/_/postgres) or [Postgres.app](https://postgresapp.com/) (Mac)
- **Management:** [pgAdmin](https://www.pgadmin.org/) is recommended for managing the instance.

### 2. Configure PostgreSQL

Start your `Postgres.app` server or Docker container and verify the installation:

- Run `pg_config --version` to verify.
- Verify the connection with **pgAdmin** and note the configuration that you will need to provide in step 3:
  - **Host**
  - **Port**
  - **Maintenance Database**
  - **User/Password**

### 3. Run the Container

Pull the image from DockerHub and run the application:

```bash
# Pull the image
docker pull uscimsc/w4h:icde-demo

# Run the container (Access via port 8501)
docker run -dp 8501:8501 uscimsc/w4h:icde-demo
```

Connect to the [W4H Web App](http://localhost:5173) and follow the on-screen prompts to connect to your Postgres instance. Once configured, you can manage users, import data, and run analytics through the W4H Web App.

---

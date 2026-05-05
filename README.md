# W4H Web App: Wearables for Health Toolkit

The [Wearables for Health (W4H) Toolkit](https://infolab.usc.edu/projects/W4H/) is an open-source suite for managing, analyzing, and visualizing wearable data. This repository contains the **W4H Web App**, the primary interface for toolkit configuration and workflow management.

---

## 🚀 Quick Start

At this stage, the W4H toolkit is available as a development package.

### 1. Prerequisites

Ensure you have the following installed:

- **PostgreSQL:** [Postgres Docker Image](https://hub.docker.com/_/postgres) or [Postgres.app](https://postgresapp.com/) (Mac).
- **Management Tools:** [pgAdmin](https://www.pgadmin.org/) is recommended for database management.

### 2. Configure PostgreSQL

Start your PostgreSQL server/container and verify the installation:

- Run `pg_config --version` to verify.
- Using **pgAdmin**, confirm your connection details (needed for Step 3):
  - **Host / Port**
  - **Maintenance Database**
  - **User / Password**

---

## 🛠️ Local Development Setup

The App is built with **Vue 3** and **Vite**.

### Recommended IDE Setup

- **Editor:** [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur).
- **Browser Tools:** [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd).

### Running the Application

1. **Start the Backend**: Follow the steps in the [w4h-api](https://github.com/USC-InfoLab/w4h-api) repository.
2. **Start the Web App**: Execute the commands listed in the section below.

### Database Initialization

If the database is not yet configured, the app will launch an **initialization wizard** on the first run. You will be prompted to enter your database credentials, after which the app will create the W4H database schema automatically.

**Development Note:** To re-trigger the setup wizard, edit the `.env` in `w4h-api` and remove the database configuration properties.

---

## 💻 Commands

### Development

```bash
npm install                     # Install dependencies
cp .env.example .env            # Create local environment file
npm run dev                     # Compile and Hot-Reload
```

_Note: To skip manual login, set `VITE_APP_ADMIN_EMAIL` and `VITE_APP_ADMIN_PASSWORD` in `.env`._

### Build & Lint

```bash
npm run build                   # Compile and minify for production
npm run lint                    # Find and fix code style issues
```

### End-to-End Testing (Playwright)

```bash
npx playwright install          # Install browsers (first run only)
npm run build                   # Required before running CI tests
npm run test:e2e                # Run all tests
npm run test:e2e -- --debug     # Run tests in headed/debug mode
```

## 🚢 Deployment

To deploy the W4H Web App to a production environment:

1. **Build the Project:** Run `npm run build` to generate a static `/dist` folder.
2. **Web Server:** Deploy the contents of the `/dist` folder to a production-grade web server (e.g., Nginx, Apache) or a static hosting service (e.g., AWS S3 + CloudFront, Vercel).
3. **Environment Variables:** Ensure production environment variables are configured in your hosting provider to point to the production **W4H API** endpoint.
4. **HTTPS:** Production deployments **must** be served over HTTPS to ensure data in transit is encrypted.

---

## 🔒 HIPAA Compliance & Security

The W4H Toolkit is engineered to facilitate HIPAA compliance with minimal external configuration.

- **Integrated Audit Logging:** The `w4h-api` automatically records all data access and system events into a dedicated audit table within the W4H database.
- **Admin Reporting:** Access logs can be viewed and managed directly through the **Admin Dashboard** in the Web App, eliminating the need for external logging services like CloudWatch.
- **Encryption:** The toolkit is designed to communicate securely with PostgreSQL. Administrators must ensure the PostgreSQL instance is configured for **Encryption at Rest** and that the Web App is served over **HTTPS**.
- **HIPAA-Eligible Hosting:** To maintain compliance, the application must be deployed on HIPAA-eligible infrastructure (e.g., AWS, GCP, or Azure) under a signed Business Associate Agreement (BAA).
- **Access Control:** User management is built-in to enforce the Principle of Least Privilege (PoLP), ensuring users only access the data necessary for their role.

---

## 🔗 Resources

- **W4H Official Site:** [infolab.usc.edu/projects/W4H/](https://infolab.usc.edu/projects/W4H/)
- **Documentation:** [Vue 3](https://vuejs.org/) | [Vite](https://vite.dev/config/) | [Playwright](https://playwright.dev/)

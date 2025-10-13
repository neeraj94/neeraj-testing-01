# RBAC Dashboard

This project is a full-stack Role-Based Access Control dashboard featuring a Spring Boot backend and a React + Vite frontend. It provides authentication with JWT (access and refresh tokens), fine-grained permissions, and a dynamic UI that responds to the authenticated user's capabilities.

## Features

- **Authentication**: Email/password with BCrypt hashing, JWT access/refresh tokens, logout and token refresh flows.
- **RBAC**: Users may have multiple roles; roles are composed of permissions. API endpoints enforce permissions via `@PreAuthorize`.
- **Domain Modules**: CRUD for users, roles, permissions, customers, invoices (with items and totals), catalog assets (brands, categories, attributes), and profile management.
- **Catalog Products**: End-to-end product workspace under **Catalog → Products** covering rich descriptions, brand pickers with logos, hierarchical category selection, multi-tax assignment, gallery/thumbnail uploads, PDF specs, SEO meta data, and attribute-driven variant matrices.
- **Dynamic Dashboard**: Frontend tabs render based on effective permissions. React Query keeps data fresh, Redux Toolkit stores auth state, and Tailwind provides styling.
- **Database Migrations**: Flyway manages schema and seed data for MySQL, including demo users and sample business data.
- **Data Exports**: Users with the new export permissions can download filtered table views (Users, Roles, Permissions, Invoices,
  Customers) to Excel, CSV, PDF, or a print-friendly layout directly from the UI.
- **Settings Workspace**: Permission-gated settings hub covers general, finance, integrations, and miscellaneous categories and
  supports live theme customization (primary color updates apply instantly across the dashboard).
- **Documentation**: OpenAPI docs available at `/swagger-ui.html` after running the backend.
- **Testing**: Basic Spring context test scaffolded; extend with service tests as needed.
- **Postman Collection**: Located at `backend/src/main/resources/postman/collection.json` for quick API exploration.

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- MySQL 8.0+

## Backend Setup

1. Navigate to the backend folder:

   ```bash
   cd backend
   ```

2. Create a MySQL database (default: `rbac_dashboard` with user/password `rbac`) and update `src/main/resources/application.yml` if needed.

3. Run database migrations and start the application:

   ```bash
   mvn spring-boot:run
   ```

   The API will be available at `http://localhost:8080/api/v1`.

   > **Note:** The application automatically performs a Flyway `repair` before running migrations. This keeps schema history
   > checksums in sync even if you previously executed an older version of the seed data.

4. Seeded user accounts:

   | Email                | Password     | Role         |
   |----------------------|--------------|--------------|
   | superadmin@demo.io   | Super@123    | SUPER_ADMIN  |
 | admin@demo.io        | Admin@123    | ADMIN        |
  | finance@demo.io      | Finance@123  | FINANCE      |

Product permissions (`PRODUCT_VIEW`, `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`) are seeded automatically for the
SUPER_ADMIN and ADMIN roles; assign them to additional roles to unlock the catalog product workspace.

## Frontend Setup

1. Install dependencies and start the dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The UI will be available at `http://localhost:5173`.

2. Configure the API base URL via the `VITE_API_BASE_URL` environment variable if your backend runs on a different host/port.

3. Grant the relevant export permissions (`USERS_EXPORT`, `ROLES_EXPORT`, `PERMISSIONS_EXPORT`, `INVOICES_EXPORT`,
   `CUSTOMERS_EXPORT`) to roles or individual users to surface the Export dropdown beside each module's "New" button. The
   seeded **SUPER_ADMIN** role already includes the full set.

## Testing

- Backend: `mvn test`
- Frontend linting: `npm run lint`
- Frontend build: `npm run build`

## Contribution workflow

When working on a feature branch, commit your work locally and run the automated frontend build before opening a pull request. If
your workflow relies on the provided automation scripts, generate the pull request summary with the helper tooling after your
commit has been created.

## Project Structure

```
backend/
  src/main/java/com/example/rbac/...       # Spring Boot application code
  src/main/resources/db/migration/         # Flyway migrations (schema + seed)
  src/main/resources/postman/              # Postman collection
frontend/
  src/app/                                 # Redux store and hooks
  src/components/                          # Shared UI components
  src/pages/                               # Route pages
  src/routes/                              # Route guards
  src/services/                            # Axios client & helpers
  src/utils/                               # Permission helpers
```

## Postman Collection

Import `backend/src/main/resources/postman/collection.json` into Postman. Use the `Login` request first; the test script automatically stores access/refresh tokens for subsequent requests.

## Notes & Next Steps

- Extend automated tests (backend service layer and frontend components) for production readiness.
- Configure HTTPS/production environment settings and secrets management before deploying.
- Tailor the UI styling and form validation to match your branding and UX needs.

Happy building!

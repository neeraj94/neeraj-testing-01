# RBAC Dashboard

This project is a full-stack Role-Based Access Control dashboard featuring a Spring Boot backend and a React + Vite frontend. It provides authentication with JWT (access and refresh tokens), fine-grained permissions, and a dynamic UI that responds to the authenticated user's capabilities.

## Features

- **Authentication**: Email/password with BCrypt hashing, JWT access/refresh tokens, logout and token refresh flows.
- **RBAC**: Users may have multiple roles; roles are composed of permissions. API endpoints enforce permissions via `@PreAuthorize`.
- **Domain Modules**: CRUD for users, roles, permissions, customers, invoices (with items and totals), and profile management.
- **Dynamic Dashboard**: Frontend tabs render based on effective permissions. React Query keeps data fresh, Redux Toolkit stores auth state, and Tailwind provides styling.
- **Database Migrations**: Flyway manages schema and seed data for PostgreSQL, including demo users and sample business data.
- **Documentation**: OpenAPI docs available at `/swagger-ui.html` after running the backend.
- **Testing**: Basic Spring context test scaffolded; extend with service tests as needed.
- **Postman Collection**: Located at `backend/src/main/resources/postman/collection.json` for quick API exploration.

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- PostgreSQL 14+

## Backend Setup

1. Navigate to the backend folder:

   ```bash
   cd backend
   ```

2. Create a PostgreSQL database and update `src/main/resources/application.yml` if needed.

3. Run database migrations and start the application:

   ```bash
   mvn spring-boot:run
   ```

   The API will be available at `http://localhost:8080/api/v1`.

4. Seeded user accounts:

   | Email                | Password     | Role         |
   |----------------------|--------------|--------------|
   | superadmin@demo.io   | Super@123    | SUPER_ADMIN  |
   | admin@demo.io        | Admin@123    | ADMIN        |
   | finance@demo.io      | Finance@123  | FINANCE      |

## Frontend Setup

1. Install dependencies and start the dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The UI will be available at `http://localhost:5173`.

2. Configure the API base URL via the `VITE_API_BASE_URL` environment variable if your backend runs on a different host/port.

## Testing

- Backend: `mvn test`
- Frontend linting: `npm run lint`

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

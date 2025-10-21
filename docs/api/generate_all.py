from pathlib import Path
import sys
import json
import copy
import re
from collections import defaultdict
from http import HTTPStatus
from html import escape

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from _builder import write_module

GROUP_ORDER = ["Admin", "Client", "Public"]
DOC_GROUP_LABELS = {
    "Admin": "Admin Endpoints",
    "Client": "Client Endpoints",
    "Public": "Public API Endpoints",
}
POSTMAN_GROUP_LABELS = {
    "Admin": "Admin",
    "Client": "Client",
    "Public": "Public APIs",
}
GROUP_DESCRIPTIONS = {
    "Admin": "Configuration, catalog, marketing, and operational APIs used by dashboard administrators.",
    "Client": "Authenticated shopper-facing APIs consumed by the storefront client once a user signs in.",
    "Public": "Anonymous storefront APIs powering landing pages, product discovery, and promotional content.",
}
MODULE_GROUPS = {
    "auth.html": "Client",
    "users.html": "Admin",
    "roles.html": "Admin",
    "permissions.html": "Admin",
    "products.html": "Admin",
    "reviews.html": "Admin",
    "categories.html": "Admin",
    "coupons.html": "Admin",
    "gallery.html": "Admin",
    "settings.html": "Admin",
    "shipping.html": "Admin",
    "public.html": "Public",
}

INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>API Reference</title>
    <link rel=\"stylesheet\" href=\"styles.css\" />
  </head>
  <body class=\"page\">
    <div class=\"docs\">
      <aside class=\"docs__nav sidebar\" aria-label=\"API navigation\">
        <div class=\"sidebar__brand\">
          <div class=\"sidebar__badge\">RBAC Commerce</div>
          <h1>API Reference</h1>
          <p>Explore every endpoint exposed by the RBAC Commerce backend, grouped by Admin, Client, and Public modules.</p>
        </div>
        <div class=\"sidebar__controls\">
          <label class=\"control\">
            <span class=\"control__label\">Environment</span>
            <select id=\"environmentSelect\">
              <option value=\"https://sandbox.api.rbac-commerce.dev\">Sandbox</option>
              <option value=\"https://staging.api.rbac-commerce.dev\">Staging</option>
              <option value=\"https://api.rbac-commerce.dev\">Production</option>
              <option value=\"custom\">Custom…</option>
            </select>
          </label>
          <label class=\"control\" id=\"customUrlControl\" hidden>
            <span class=\"control__label\">Custom base URL</span>
            <input id=\"baseUrl\" type=\"url\" spellcheck=\"false\" value=\"https://sandbox.api.rbac-commerce.dev\" />
          </label>
          <label class=\"control\">
            <span class=\"control__label\">Bearer token</span>
            <input id=\"authToken\" type=\"text\" spellcheck=\"false\" placeholder=\"Optional token for private endpoints\" />
          </label>
        </div>
        <nav class=\"sidebar__nav\" aria-label=\"Modules\">
          <h2>Modules</h2>
          <ul class=\"sidebar__tree\" role=\"tree\">
            {nav_groups}
          </ul>
        </nav>
      </aside>
      <main class=\"docs__content content\" id=\"docsContent\" tabindex=\"-1\">
        <header class=\"hero\">
          <h2>API Reference</h2>
          <p>Dive into module-specific references, or jump directly to the Admin, Client, or Public API sections below.</p>
          <p><strong>Selected base URL:</strong> <span data-base-display>https://sandbox.api.rbac-commerce.dev</span></p>
        </header>
        {sections}
      </main>
    </div>
    <footer class=\"docs__footer\">
      <a href=\"https://github.com/neeraj94/neeraj-testing-01\">View source on GitHub</a>
    </footer>
    <script src=\"app.js\" defer></script>
  </body>
</html>
"""

NAV_GROUP_TEMPLATE = """
<li class=\"sidebar__group\" role=\"presentation\">
  <div class=\"sidebar__group-title\">{label}</div>
  <ul role=\"group\">
    {links}
  </ul>
</li>
"""

NAV_LINK_TEMPLATE = '<li role="treeitem"><a href="#{slug}" data-endpoint-link="{slug}">{title}</a></li>'

GROUP_SECTION_TEMPLATE = """
<section class=\"module-group\" id=\"{group_id}\">
  <h2>{heading}</h2>
  <p>{description}</p>
  <div class=\"module-grid\">
    {cards}
  </div>
</section>
"""

MODULE_CARD_TEMPLATE = """
<article class=\"module-card\" id=\"{slug}\">
  <h3>{title}</h3>
  <p>{summary}</p>
  <p class=\"module-card__path\">Base path: <code>{base}</code></p>
  <ul class=\"module-card__endpoints\">
    {endpoints}
  </ul>
  <p><a class=\"button button--inline\" href=\"{file}\">Open reference</a></p>
  {more}
</article>
"""

ROOT_DIR = CURRENT_DIR.parent.parent


def slug_for(file_name: str) -> str:
    stem = Path(file_name).stem.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return f"module-{slug}" if slug else "module-reference"


def status_text(code: int) -> str:
    try:
        return HTTPStatus(code).phrase
    except ValueError:
        return f"HTTP {code}"


def format_path_for_raw(path: str) -> str:
    def replace(match) -> str:
        token = match.group(1)
        clean = token.split(":")[0]
        return f":{clean}"

    return re.sub(r"\{([^}]+)\}", replace, path)


def build_path_segments(path: str) -> list:
    segments = []
    for part in path.strip("/").split("/"):
        if not part:
            continue
        if part.startswith("{") and part.endswith("}"):
            clean = part[1:-1].split(":")[0]
            segments.append(f":{clean}")
        else:
            segments.append(part)
    return segments


def sample_for_param(name: str) -> str:
    lower = name.lower()
    if "page" in lower:
        return "0"
    if "size" in lower or "limit" in lower:
        return "20"
    if "search" in lower or "query" in lower:
        return "aurora"
    if "sort" in lower:
        return "name"
    if "direction" in lower or "order" in lower:
        return "asc"
    if "status" in lower:
        return "ACTIVE"
    if "token" in lower:
        return "sample-token"
    if "country" in lower:
        return "1"
    if "state" in lower:
        return "10"
    if "city" in lower:
        return "201"
    if lower.endswith("ids"):
        return "1,2"
    if lower.endswith("id"):
        return "1"
    if "slug" in lower:
        return "aurora-lamp"
    if "email" in lower:
        return "user@example.com"
    return ""


def prepare_headers(raw_headers, requires_auth: bool, method_has_body: bool, body_value) -> list:
    prepared = []
    seen = set()
    for key, value in raw_headers or []:
        lower = key.lower()
        if lower in seen:
            continue
        prepared.append({"key": key, "value": value, "type": "text"})
        seen.add(lower)

    if requires_auth and "authorization" not in seen:
        prepared.insert(0, {"key": "Authorization", "value": "Bearer {{authToken}}", "type": "text"})
        seen.add("authorization")

    if "accept" not in seen:
        prepared.append({"key": "Accept", "value": "application/json", "type": "text"})
        seen.add("accept")

    body_present = False
    if isinstance(body_value, str):
        body_present = body_value.strip() != ""
    elif body_value is not None:
        body_present = True

    if method_has_body and body_present and "content-type" not in seen:
        prepared.append({"key": "Content-Type", "value": "application/json", "type": "text"})
        seen.add("content-type")

    return prepared


def write_index(modules) -> None:
    grouped = defaultdict(list)
    for module in modules:
        grouped[module["group"]].append(module)

    nav_groups = []
    sections = []

    for group in GROUP_ORDER:
        items = grouped.get(group, [])
        if not items:
            continue

        label = DOC_GROUP_LABELS[group]
        links = "\n".join(
            NAV_LINK_TEMPLATE.format(slug=escape(module["slug"]), title=escape(module["title"]))
            for module in items
        )
        nav_groups.append(
            NAV_GROUP_TEMPLATE.format(label=escape(label), links=links)
        )

        cards = []
        for module in items:
            previews = []
            for endpoint in module["endpoints"][:5]:
                full_path = module["base"] + endpoint["path"]
                previews.append(
                    f"<li><span class=\"sidebar__method\">{escape(endpoint['method'])}</span><code>{escape(full_path)}</code></li>"
                )
            if not previews:
                previews.append("<li><em>No documented endpoints.</em></li>")

            remaining = max(len(module["endpoints"]) - 5, 0)
            more_html = ""
            if remaining:
                suffix = "s" if remaining != 1 else ""
                more_html = f"<p class=\"module-card__more\">…and {remaining} more endpoint{suffix}.</p>"

            cards.append(
                MODULE_CARD_TEMPLATE.format(
                    slug=escape(module["slug"]),
                    title=escape(module["title"]),
                    summary=escape(module["summary"]),
                    base=escape(module["base"]),
                    endpoints="\n    ".join(previews),
                    file=escape(module["file"]),
                    more=more_html,
                )
            )

        sections.append(
            GROUP_SECTION_TEMPLATE.format(
                group_id=f"group-{group.lower()}",
                heading=escape(label),
                description=escape(GROUP_DESCRIPTIONS[group]),
                cards="\n    ".join(cards),
            )
        )

    index_html = INDEX_TEMPLATE.format(
        nav_groups="\n".join(nav_groups),
        sections="\n".join(sections),
    )
    (CURRENT_DIR / "index.html").write_text(index_html)


def write_postman_collection(modules) -> None:
    grouped = defaultdict(list)
    for module in modules:
        grouped[module["group"]].append(module)

    collection = {
        "info": {
            "name": "RBAC Commerce API",
            "description": "Complete RBAC Commerce API organised by Admin, Client, and Public modules.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": [],
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:8080", "type": "string"},
            {"key": "authToken", "value": "", "type": "string"},
        ],
    }

    for group in GROUP_ORDER:
        modules_in_group = grouped.get(group, [])
        if not modules_in_group:
            continue

        folder = {
            "name": POSTMAN_GROUP_LABELS[group],
            "description": GROUP_DESCRIPTIONS[group],
            "item": [],
        }

        for module in modules_in_group:
            module_folder = {
                "name": module["title"],
                "description": f"{module['summary']}\n\nBase path: {module['base']}",
                "item": [],
            }

            for endpoint in module["endpoints"]:
                method = endpoint["method"].upper()
                requires_auth = endpoint.get("auth", "Bearer").lower() != "public"
                raw_headers = endpoint.get("headers") or []
                body_value = endpoint.get("body") if "body" in endpoint else None
                method_has_body = method in {"POST", "PUT", "PATCH", "DELETE"}

                headers = prepare_headers(raw_headers, requires_auth, method_has_body, body_value)

                url_path = module["base"] + endpoint["path"]
                url = {
                    "raw": "{{baseUrl}}" + format_path_for_raw(url_path),
                    "host": ["{{baseUrl}}"],
                    "path": build_path_segments(url_path),
                }

                if endpoint.get("params"):
                    url["query"] = [
                        {
                            "key": name,
                            "value": sample_for_param(name),
                            "description": desc,
                        }
                        for name, desc in endpoint["params"]
                    ]

                request_body = None
                if "body" in endpoint and endpoint["body"] is not None:
                    payload = endpoint["body"]
                    if isinstance(payload, str):
                        raw_body = payload
                    else:
                        raw_body = json.dumps(payload, indent=2)
                    request_body = {
                        "mode": "raw",
                        "raw": raw_body,
                        "options": {"raw": {"language": "json"}},
                    }

                description = (
                    f"{endpoint['description']}\n\nAuth: "
                    f"{'Bearer token required' if requires_auth else 'No authentication required'}"
                )

                request = {
                    "name": endpoint["name"],
                    "request": {
                        "method": method,
                        "header": headers,
                        "url": url,
                        "description": description,
                    },
                    "response": [],
                }

                if request_body is not None:
                    request["request"]["body"] = request_body

                if requires_auth:
                    request["request"]["auth"] = {
                        "type": "bearer",
                        "bearer": [
                            {"key": "token", "value": "{{authToken}}", "type": "string"}
                        ],
                    }

                original_request = copy.deepcopy(request["request"])

                success_status = endpoint["success"]["status"]
                success_body = endpoint["success"].get("body")
                success_headers = []
                success_payload = ""
                if success_body is not None:
                    success_payload = json.dumps(success_body, indent=2)
                    success_headers.append({"key": "Content-Type", "value": "application/json"})

                request["response"].append(
                    {
                        "name": f"{endpoint['name']} - Success",
                        "originalRequest": original_request,
                        "status": status_text(success_status),
                        "code": success_status,
                        "header": success_headers,
                        "body": success_payload,
                    }
                )

                for status_code, message, example in endpoint.get("errors", []):
                    error_headers = []
                    error_payload = ""
                    if example is not None:
                        error_payload = json.dumps(example, indent=2)
                        error_headers.append({"key": "Content-Type", "value": "application/json"})

                    request["response"].append(
                        {
                            "name": f"{endpoint['name']} - {message}",
                            "originalRequest": original_request,
                            "status": status_text(status_code),
                            "code": status_code,
                            "header": error_headers,
                            "body": error_payload,
                            "description": message,
                        }
                    )

                module_folder["item"].append(request)

            folder["item"].append(module_folder)

        collection["item"].append(folder)

    output_path = ROOT_DIR / "backend" / "src" / "main" / "resources" / "postman" / "collection.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(collection, indent=2))

page = lambda item: {
    "content": [item],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": True,
}

modules = []
modules.append({
    "file": "auth.html",
    "title": "Authentication APIs",
    "summary": "Token issuance, refresh, logout, and verification flows used by the dashboard and storefront.",
    "base": "/api/v1/client/auth",
    "endpoints": [
        {
            "name": "Sign up",
            "method": "POST",
            "path": "/signup",
            "auth": "Public",
            "description": "Registers a new dashboard operator or storefront customer depending on the supplied role.",
            "headers": [("Content-Type", "application/json"), ("Accept", "application/json")],
            "body": {
                "email": "alex@example.com",
                "password": "P@ssw0rd!",
                "firstName": "Alex",
                "lastName": "Doe",
                "role": "CUSTOMER"
            },
            "success": {
                "status": 201,
                "body": {
                    "token": "eyJhbGciOi...",
                    "refreshToken": "c9f7b...",
                    "expiresIn": 3600,
                    "user": {
                        "id": 58,
                        "email": "alex@example.com",
                        "firstName": "Alex",
                        "lastName": "Doe",
                        "roles": ["CUSTOMER"]
                    }
                }
            },
            "errors": [
                (409, "Email already registered", {"error": "Conflict", "message": "EMAIL_IN_USE"}),
                (400, "Validation failed", {"error": "Bad Request", "message": "Password must be at least 8 characters"})
            ]
        },
        {
            "name": "Login",
            "method": "POST",
            "path": "/login",
            "auth": "Public",
            "description": "Authenticates an existing user and returns a JWT access token and refresh token.",
            "headers": [("Content-Type", "application/json")],
            "body": {"email": "alex@example.com", "password": "P@ssw0rd!"},
            "success": {
                "status": 200,
                "body": {
                    "token": "eyJhbGciOi...",
                    "refreshToken": "c9f7b...",
                    "expiresIn": 3600,
                    "user": {"id": 58, "email": "alex@example.com", "firstName": "Alex", "lastName": "Doe"}
                }
            },
            "errors": [
                (401, "Invalid credentials", {"error": "Unauthorized", "message": "INVALID_CREDENTIALS"})
            ]
        },
        {
            "name": "Refresh token",
            "method": "POST",
            "path": "/refresh",
            "auth": "Public",
            "description": "Issues a new access token using a valid refresh token.",
            "headers": [("Content-Type", "application/json")],
            "body": {"refreshToken": "c9f7b..."},
            "success": {
                "status": 200,
                "body": {"token": "eyJhbGciOi...", "refreshToken": "a8d4...", "expiresIn": 3600}
            },
            "errors": [
                (401, "Refresh token expired", {"error": "Unauthorized", "message": "REFRESH_TOKEN_EXPIRED"})
            ]
        },
        {
            "name": "Logout",
            "method": "POST",
            "path": "/logout",
            "auth": "Public",
            "description": "Revokes the supplied refresh token immediately.",
            "headers": [("Content-Type", "application/json")],
            "body": {"refreshToken": "c9f7b..."},
            "success": {"status": 204, "body": None},
            "errors": [
                (400, "Unknown refresh token", {"error": "Bad Request", "message": "REFRESH_TOKEN_NOT_FOUND"})
            ]
        },
        {
            "name": "Current user",
            "method": "GET",
            "path": "/me",
            "auth": "Bearer",
            "description": "Returns the profile of the authenticated principal.",
            "headers": [("Authorization", "Bearer <token>")],
            "success": {
                "status": 200,
                "body": {
                    "id": 12,
                    "email": "ops@example.com",
                    "firstName": "Operations",
                    "lastName": "Lead",
                    "roles": ["ADMIN"],
                    "permissions": ["PRODUCT_VIEW", "USER_VIEW_GLOBAL"],
                    "status": "ACTIVE"
                }
            },
            "errors": [
                (401, "Missing token", {"error": "Unauthorized", "message": "TOKEN_REQUIRED"})
            ]
        },
        {
            "name": "Verify email (body)",
            "method": "POST",
            "path": "/verify",
            "auth": "Public",
            "description": "Confirms an email verification token when posted from the dashboard.",
            "headers": [("Content-Type", "application/json")],
            "body": {"token": "VeR1Fy-123"},
            "success": {"status": 200, "body": {"verified": True, "email": "alex@example.com"}},
            "errors": [
                (410, "Expired token", {"error": "Gone", "message": "VERIFICATION_TOKEN_EXPIRED"})
            ]
        },
        {
            "name": "Verify email (link)",
            "method": "GET",
            "path": "/verify",
            "auth": "Public",
            "description": "Browser friendly verification endpoint. Accepts a \"token\" query string parameter.",
            "params": [("token", "Verification token returned in the email link")],
            "success": {"status": 200, "body": {"verified": True, "email": "alex@example.com"}},
            "errors": [
                (400, "Missing token", {"error": "Bad Request", "message": "TOKEN_REQUIRED"})
            ]
        }
    ]
})
modules.append({
    "file": "users.html",
    "title": "User Management APIs",
    "summary": "CRUD, status controls, role assignment, and profile updates for internal and customer accounts.",
    "base": "/api/v1",
    "endpoints": [
        {
            "name": "List users",
            "method": "GET",
            "path": "/users",
            "auth": "Bearer",
            "description": "Returns a paginated list of users filtered by optional search, sort, and paging parameters.",
            "params": [("search", "Optional name/email fragment"), ("page", "Zero-based page index"), ("size", "Page size"), ("sort", "Sort field"), ("direction", "asc or desc")],
            "success": {"status": 200, "body": page({"id": 12, "email": "ops@example.com", "firstName": "Operations", "lastName": "Lead", "roles": ["ADMIN"], "status": "ACTIVE"})},
            "errors": [(403, "Missing permission", {"error": "Forbidden", "message": "USER_VIEW_DENIED"})]
        },
        {
            "name": "User summary",
            "method": "GET",
            "path": "/users/summary",
            "auth": "Bearer",
            "description": "Aggregated counts of active, invited, and locked users for dashboard widgets.",
            "success": {"status": 200, "body": {"total": 145, "active": 137, "invited": 5, "locked": 3}},
            "errors": []
        },
        {
            "name": "Create user",
            "method": "POST",
            "path": "/users",
            "auth": "Bearer",
            "description": "Creates a new user and dispatches an activation email if enabled.",
            "headers": [("Content-Type", "application/json")],
            "body": {"email": "new.manager@example.com", "firstName": "New", "lastName": "Manager", "password": "Temp@123", "roles": [1], "sendInvite": True},
            "success": {"status": 201, "body": {"id": 89, "email": "new.manager@example.com", "status": "INVITED"}},
            "errors": [(409, "Email already exists", {"error": "Conflict", "message": "EMAIL_IN_USE"})]
        },
        {
            "name": "Get user",
            "method": "GET",
            "path": "/users/{id}",
            "auth": "Bearer",
            "description": "Fetches a full user profile including assigned roles and direct permissions.",
            "success": {"status": 200, "body": {"id": 12, "email": "ops@example.com", "roles": ["ADMIN"], "permissions": ["PRODUCT_VIEW"], "status": "ACTIVE"}},
            "errors": [(404, "Unknown user", {"error": "Not Found", "message": "USER_NOT_FOUND"})]
        },
        {
            "name": "Update user",
            "method": "PUT",
            "path": "/users/{id}",
            "auth": "Bearer",
            "description": "Overwrites core profile details including contact information and roles.",
            "headers": [("Content-Type", "application/json")],
            "body": {"firstName": "Ops", "lastName": "Lead", "phone": "+1-404-555-0111", "roles": [1]},
            "success": {"status": 200, "body": {"id": 12, "phone": "+1-404-555-0111"}},
            "errors": []
        },
        {
            "name": "Update user status",
            "method": "PATCH",
            "path": "/users/{id}/status",
            "auth": "Bearer",
            "description": "Activates, suspends, or locks a user account.",
            "headers": [("Content-Type", "application/json")],
            "body": {"status": "SUSPENDED", "reason": "Repeated failed logins"},
            "success": {"status": 200, "body": {"id": 12, "status": "SUSPENDED"}},
            "errors": []
        },
        {
            "name": "Delete user",
            "method": "DELETE",
            "path": "/users/{id}",
            "auth": "Bearer",
            "description": "Removes a user. Audit history retains their activities.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "Assign roles",
            "method": "POST",
            "path": "/users/{id}/roles",
            "auth": "Bearer",
            "description": "Adds one or more role IDs to the user, merging with existing assignments.",
            "headers": [("Content-Type", "application/json")],
            "body": {"roleIds": [3, 4]},
            "success": {"status": 200, "body": {"id": 12, "roles": ["ADMIN", "CATALOG_MANAGER"]}},
            "errors": []
        },
        {
            "name": "Remove role",
            "method": "DELETE",
            "path": "/users/{userId}/roles/{roleId}",
            "auth": "Bearer",
            "description": "Detaches a role from the user without affecting other assignments.",
            "success": {"status": 200, "body": {"id": 12, "roles": ["ADMIN"]}},
            "errors": []
        },
        {
            "name": "Update direct permissions",
            "method": "PUT",
            "path": "/users/{id}/permissions",
            "auth": "Bearer",
            "description": "Sets explicit allow/deny permissions overriding role defaults.",
            "headers": [("Content-Type", "application/json")],
            "body": {"granted": ["PRODUCT_EXPORT"], "revoked": ["ORDER_DELETE"]},
            "success": {"status": 200, "body": {"id": 12, "permissions": ["PRODUCT_VIEW", "PRODUCT_EXPORT"], "revoked": ["ORDER_DELETE"]}},
            "errors": []
        },
        {
            "name": "Force verify user",
            "method": "POST",
            "path": "/users/{id}/verify",
            "auth": "Bearer",
            "description": "Marks a user's email as verified without email interaction (admin only).",
            "success": {"status": 200, "body": {"id": 12, "emailVerified": True}},
            "errors": []
        },
        {
            "name": "Unlock user",
            "method": "POST",
            "path": "/users/{id}/unlock",
            "auth": "Bearer",
            "description": "Clears login lock flags so the user can sign in again.",
            "success": {"status": 200, "body": {"id": 12, "locked": False}},
            "errors": []
        },
        {
            "name": "Update own profile",
            "method": "PUT",
            "path": "/profile",
            "auth": "Bearer",
            "description": "Allows the authenticated user to change their name, avatar, or contact number.",
            "headers": [("Content-Type", "application/json")],
            "body": {"firstName": "Ops", "lastName": "Lead", "phone": "+1-404-555-0112"},
            "success": {"status": 200, "body": {"id": 12, "phone": "+1-404-555-0112"}},
            "errors": []
        }
    ]
})
modules.append({
    "file": "roles.html",
    "title": "Role APIs",
    "summary": "Manage reusable role definitions and bind permissions for RBAC.",
    "base": "/api/v1/roles",
    "endpoints": [
        {
            "name": "List roles",
            "method": "GET",
            "path": "",
            "auth": "Bearer",
            "description": "Returns paginated roles with permission counts.",
            "params": [("page", "Page index"), ("size", "Page size"), ("sort", "Sort field"), ("direction", "asc/desc")],
            "success": {"status": 200, "body": page({"id": 3, "name": "Catalog Manager", "code": "CATALOG_MANAGER", "permissions": 12})},
            "errors": []
        },
        {
            "name": "Create role",
            "method": "POST",
            "path": "",
            "auth": "Bearer",
            "description": "Creates a role skeleton optionally seeded with permissions.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Support", "code": "SUPPORT", "description": "Support desk role"},
            "success": {"status": 201, "body": {"id": 9, "name": "Support", "code": "SUPPORT"}},
            "errors": [(409, "Duplicate role code", {"error": "Conflict", "message": "ROLE_CODE_EXISTS"})]
        },
        {
            "name": "Get role",
            "method": "GET",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Fetches full role metadata with permission IDs.",
            "success": {"status": 200, "body": {"id": 3, "name": "Catalog Manager", "permissions": [14, 19]}},
            "errors": [(404, "Missing role", {"error": "Not Found", "message": "ROLE_NOT_FOUND"})]
        },
        {
            "name": "Update role",
            "method": "PUT",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Updates role name/description or slug.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Catalog Supervisor", "description": "Elevated catalog rights"},
            "success": {"status": 200, "body": {"id": 3, "name": "Catalog Supervisor"}},
            "errors": []
        },
        {
            "name": "Delete role",
            "method": "DELETE",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Removes a role when no users depend on it.",
            "success": {"status": 204, "body": None},
            "errors": [(409, "Role in use", {"error": "Conflict", "message": "ROLE_ASSIGNED_TO_USERS"})]
        },
        {
            "name": "Assign permissions",
            "method": "POST",
            "path": "/{id}/permissions",
            "auth": "Bearer",
            "description": "Adds permission IDs to the role.",
            "headers": [("Content-Type", "application/json")],
            "body": {"permissionIds": [4, 7, 9]},
            "success": {"status": 200, "body": {"id": 3, "permissions": [4, 7, 9]}},
            "errors": []
        },
        {
            "name": "Remove permission",
            "method": "DELETE",
            "path": "/{id}/permissions/{permissionId}",
            "auth": "Bearer",
            "description": "Removes a permission from a role.",
            "success": {"status": 200, "body": {"id": 3, "permissions": [7, 9]}},
            "errors": []
        }
    ]
})
modules.append({
    "file": "permissions.html",
    "title": "Permission APIs",
    "summary": "CRUD over fine-grained permissions powering RBAC overrides.",
    "base": "/api/v1/permissions",
    "endpoints": [
        {
            "name": "List permissions",
            "method": "GET",
            "path": "",
            "auth": "Bearer",
            "description": "Paginated permission catalogue with grouping metadata.",
            "params": [("page", "Page index"), ("size", "Page size"), ("sort", "Sort field"), ("direction", "asc/desc")],
            "success": {"status": 200, "body": page({"id": 5, "code": "PRODUCT_VIEW", "name": "Products: View"})},
            "errors": []
        },
        {
            "name": "Create permission",
            "method": "POST",
            "path": "",
            "auth": "Bearer",
            "description": "Introduces a custom permission code and label.",
            "headers": [("Content-Type", "application/json")],
            "body": {"code": "CUSTOM_REPORT", "name": "Reports: Custom"},
            "success": {"status": 201, "body": {"id": 91, "code": "CUSTOM_REPORT"}},
            "errors": [(409, "Duplicate code", {"error": "Conflict", "message": "PERMISSION_CODE_EXISTS"})]
        },
        {
            "name": "Update permission",
            "method": "PUT",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Renames the permission label.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Reports: Custom (Beta)"},
            "success": {"status": 200, "body": {"id": 91, "name": "Reports: Custom (Beta)"}},
            "errors": []
        },
        {
            "name": "Delete permission",
            "method": "DELETE",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Deletes the permission if not bound to any role.",
            "success": {"status": 204, "body": None},
            "errors": [(409, "Bound to role", {"error": "Conflict", "message": "PERMISSION_IN_USE"})]
        }
    ]
})
modules.append({
    "file": "products.html",
    "title": "Product & Asset APIs",
    "summary": "Administrative product CRUD, variant authoring, and media asset uploads.",
    "base": "/api/v1",
    "endpoints": [
        {
            "name": "List products",
            "method": "GET",
            "path": "/products",
            "auth": "Bearer",
            "description": "Returns paginated product summaries with search support.",
            "params": [("page", "Page index"), ("size", "Page size"), ("search", "Name/SKU filter")],
            "success": {"status": 200, "body": page({"id": 101, "name": "Aurora Lamp", "slug": "aurora-lamp", "sku": "AUR-LAMP-001", "status": "ACTIVE"})},
            "errors": []
        },
        {
            "name": "Get product",
            "method": "GET",
            "path": "/products/{id}",
            "auth": "Bearer",
            "description": "Loads the full editable product payload including variants and media.",
            "success": {"status": 200, "body": {"id": 101, "name": "Aurora Lamp", "slug": "aurora-lamp", "sku": "AUR-LAMP-001", "pricing": {"currency": "USD", "price": 129.0}, "inventory": {"track": True, "stock": 58}}},
            "errors": [(404, "Unknown product", {"error": "Not Found", "message": "PRODUCT_NOT_FOUND"})]
        },
        {
            "name": "Create product",
            "method": "POST",
            "path": "/products",
            "auth": "Bearer",
            "description": "Creates a new catalog entry with variants, pricing, and media associations.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Aurora Lamp", "slug": "aurora-lamp", "sku": "AUR-LAMP-001", "brandId": 6, "categoryIds": [3], "pricing": {"currency": "USD", "price": 129.0}},
            "success": {"status": 201, "body": {"id": 101, "slug": "aurora-lamp"}},
            "errors": [(409, "Slug exists", {"error": "Conflict", "message": "PRODUCT_SLUG_EXISTS"})]
        },
        {
            "name": "Update product",
            "method": "PUT",
            "path": "/products/{id}",
            "auth": "Bearer",
            "description": "Updates product details, replacing nested collections supplied in the payload.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Aurora Lamp", "slug": "aurora-lamp", "pricing": {"currency": "USD", "price": 129.0, "discountPrice": 109.0}},
            "success": {"status": 200, "body": {"id": 101, "discountPrice": 109.0}},
            "errors": []
        },
        {
            "name": "Delete product",
            "method": "DELETE",
            "path": "/products/{id}",
            "auth": "Bearer",
            "description": "Deletes the product and archived variants.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "Upload product assets",
            "method": "POST",
            "path": "/products/assets/{type}",
            "auth": "Bearer",
            "description": "Uploads product images or documents. Supported types include primary, gallery, and manual.",
            "headers": [("Content-Type", "multipart/form-data")],
            "body": None,
            "success": {"status": 200, "body": [{"url": "https://cdn.example.com/products/aurora/primary.jpg", "key": "products/aurora/primary.jpg", "mimeType": "image/jpeg", "sizeBytes": 245678}]},
            "errors": [(400, "No files provided", {"error": "Bad Request", "message": "Select at least one file to upload"})]
        },
        {
            "name": "Serve product asset",
            "method": "GET",
            "path": "/products/assets/{type}/{key}",
            "auth": "Public",
            "description": "Streams a previously uploaded asset. Responses use the stored MIME type when available.",
            "success": {"status": 200, "body": None},
            "errors": [(404, "Unknown key", {"error": "Not Found", "message": "ASSET_NOT_FOUND"})]
        }
    ]
})
modules.append({
    "file": "reviews.html",
    "title": "Product Review APIs",
    "summary": "Moderate customer reviews, toggle visibility, and inject staff replies.",
    "base": "/api/v1/product-reviews",
    "endpoints": [
        {
            "name": "List reviews",
            "method": "GET",
            "path": "",
            "auth": "Bearer",
            "description": "Paginated filterable review directory with rating, product, and customer filters.",
            "params": [("page", "Page index"), ("size", "Page size"), ("productId", "Filter by product"), ("ratingMin", "Minimum rating"), ("ratingMax", "Maximum rating")],
            "success": {"status": 200, "body": page({"id": 511, "rating": 5, "title": "Stunning glow", "comment": "Looks incredible on the desk.", "visible": True})},
            "errors": []
        },
        {
            "name": "Get review",
            "method": "GET",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Loads full review details including moderation metadata and attachments.",
            "success": {"status": 200, "body": {"id": 511, "rating": 5, "title": "Stunning glow", "comment": "Looks incredible on the desk.", "visible": True}},
            "errors": [(404, "Missing review", {"error": "Not Found", "message": "REVIEW_NOT_FOUND"})]
        },
        {
            "name": "Create review",
            "method": "POST",
            "path": "",
            "auth": "Bearer",
            "description": "Allows staff to seed a curated review on behalf of a user.",
            "headers": [("Content-Type", "application/json")],
            "body": {"productId": 101, "customerId": 44, "rating": 5, "title": "Stunning glow", "comment": "Looks incredible on the desk.", "visible": True},
            "success": {"status": 201, "body": {"id": 512, "visible": True}},
            "errors": [(400, "Invalid rating", {"error": "Bad Request", "message": "RATING_OUT_OF_RANGE"})]
        },
        {
            "name": "Update review",
            "method": "PUT",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Edits an existing review's visibility, rating, or response.",
            "headers": [("Content-Type", "application/json")],
            "body": {"rating": 4, "visible": False, "staffResponse": "We'll reach out to help."},
            "success": {"status": 200, "body": {"id": 511, "visible": False, "rating": 4}},
            "errors": []
        },
        {
            "name": "Delete review",
            "method": "DELETE",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Removes a review permanently.",
            "success": {"status": 204, "body": None},
            "errors": []
        }
    ]
})
modules.append({
    "file": "categories.html",
    "title": "Categories & Brands APIs",
    "summary": "Manage taxonomy trees, category media, and brand registries for the storefront.",
    "base": "/api/v1",
    "endpoints": [
        {
            "name": "List categories",
            "method": "GET",
            "path": "/categories",
            "auth": "Bearer",
            "description": "Returns paginated categories including hierarchy metadata.",
            "params": [("page", "Page index"), ("size", "Page size"), ("search", "Optional search")],
            "success": {"status": 200, "body": page({"id": 3, "name": "Lighting", "slug": "lighting", "parent": None, "status": "PUBLISHED"})},
            "errors": []
        },
        {
            "name": "Get category",
            "method": "GET",
            "path": "/categories/{id}",
            "auth": "Bearer",
            "description": "Retrieves category details including SEO and content blocks.",
            "success": {"status": 200, "body": {"id": 3, "name": "Lighting", "slug": "lighting", "parentId": None, "seo": {"title": "Lighting"}}},
            "errors": [(404, "Category missing", {"error": "Not Found", "message": "CATEGORY_NOT_FOUND"})]
        },
        {
            "name": "Category options",
            "method": "GET",
            "path": "/categories/options",
            "auth": "Bearer",
            "description": "Lightweight category list for dropdowns, excluding an optional id to prevent cycles.",
            "params": [("excludeId", "Optional category id to exclude")],
            "success": {"status": 200, "body": [{"id": 1, "name": "Home"}, {"id": 3, "name": "Lighting"}]},
            "errors": []
        },
        {
            "name": "Create category",
            "method": "POST",
            "path": "/categories",
            "auth": "Bearer",
            "description": "Creates a new category with optional parent linkage and SEO metadata.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Smart Lighting", "slug": "smart-lighting", "parentId": 3, "description": "App controlled fixtures"},
            "success": {"status": 201, "body": {"id": 11, "slug": "smart-lighting"}},
            "errors": [(409, "Slug exists", {"error": "Conflict", "message": "CATEGORY_SLUG_EXISTS"})]
        },
        {
            "name": "Update category",
            "method": "PUT",
            "path": "/categories/{id}",
            "auth": "Bearer",
            "description": "Updates category content, SEO data, or parent assignment.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Smart Lighting", "slug": "smart-lighting", "parentId": 3},
            "success": {"status": 200, "body": {"id": 11, "parentId": 3}},
            "errors": []
        },
        {
            "name": "Delete category",
            "method": "DELETE",
            "path": "/categories/{id}",
            "auth": "Bearer",
            "description": "Deletes a category if no products reference it.",
            "success": {"status": 204, "body": None},
            "errors": [(409, "Category in use", {"error": "Conflict", "message": "CATEGORY_IN_USE"})]
        },
        {
            "name": "Upload category asset",
            "method": "POST",
            "path": "/categories/assets/{type}",
            "auth": "Bearer",
            "description": "Uploads a category icon, banner, or cover image (type path segment).",
            "headers": [("Content-Type", "multipart/form-data")],
            "body": None,
            "success": {"status": 200, "body": {"type": "ICON", "url": "https://cdn.example.com/categories/lighting/icon.png", "originalFilename": "icon.png"}},
            "errors": []
        },
        {
            "name": "Serve category asset",
            "method": "GET",
            "path": "/categories/assets/{type}/{key}",
            "auth": "Public",
            "description": "Streams a stored category asset by key.",
            "success": {"status": 200, "body": None},
            "errors": [(404, "Unknown key", {"error": "Not Found", "message": "ASSET_NOT_FOUND"})]
        },
        {
            "name": "List brands",
            "method": "GET",
            "path": "/brands",
            "auth": "Bearer",
            "description": "Paginated brand directory supporting search.",
            "params": [("page", "Page index"), ("size", "Page size"), ("search", "Search term")],
            "success": {"status": 200, "body": page({"id": 6, "name": "Glow Home", "slug": "glow-home"})},
            "errors": []
        },
        {
            "name": "Create brand",
            "method": "POST",
            "path": "/brands",
            "auth": "Bearer",
            "description": "Creates a brand record optionally linking to a media logo.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Glow Home", "slug": "glow-home", "website": "https://glow.example.com"},
            "success": {"status": 201, "body": {"id": 6, "slug": "glow-home"}},
            "errors": [(409, "Slug exists", {"error": "Conflict", "message": "BRAND_SLUG_EXISTS"})]
        },
        {
            "name": "Upload brand logo",
            "method": "POST",
            "path": "/brands/assets",
            "auth": "Bearer",
            "description": "Uploads and stores a brand logo image.",
            "headers": [("Content-Type", "multipart/form-data")],
            "body": None,
            "success": {"status": 200, "body": {"url": "https://cdn.example.com/brands/glow-home/logo.png", "originalFilename": "logo.png"}},
            "errors": []
        },
        {
            "name": "Serve brand logo",
            "method": "GET",
            "path": "/brands/assets/{key}",
            "auth": "Public",
            "description": "Streams a stored brand logo.",
            "success": {"status": 200, "body": None},
            "errors": []
        }
    ]
})
modules.append({
    "file": "coupons.html",
    "title": "Coupon Management APIs",
    "summary": "Create, update, and reference discount coupons with product/category targeting.",
    "base": "/api/v1/coupons",
    "endpoints": [
        {
            "name": "List coupons",
            "method": "GET",
            "path": "",
            "auth": "Bearer",
            "description": "Paginated coupon list with type, state, discount, and search filters.",
            "params": [("page", "Page index"), ("size", "Page size"), ("type", "PRODUCT, CART, SIGNUP"), ("state", "Draft/Active/Expired"), ("discountType", "PERCENTAGE/FLAT"), ("search", "Search term")],
            "success": {"status": 200, "body": page({"id": 41, "name": "New Year Glow", "code": "NYGLOW10", "type": "PRODUCT", "state": "ACTIVE"})},
            "errors": []
        },
        {
            "name": "Get coupon",
            "method": "GET",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Returns the full coupon definition including eligibility lists.",
            "success": {"status": 200, "body": {"id": 41, "name": "New Year Glow", "code": "NYGLOW10", "type": "PRODUCT", "discountType": "PERCENTAGE", "discountValue": 10, "products": [{"id": 101, "name": "Aurora Lamp"}] }},
            "errors": [(404, "Coupon missing", {"error": "Not Found", "message": "COUPON_NOT_FOUND"})]
        },
        {
            "name": "Create coupon",
            "method": "POST",
            "path": "",
            "auth": "Bearer",
            "description": "Creates a coupon with optional product, category, or user targeting.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "New Year Glow", "code": "NYGLOW10", "type": "PRODUCT", "discountType": "PERCENTAGE", "discountValue": 10, "productIds": [101], "categoryIds": [3], "startDate": "2025-01-01T00:00:00Z", "endDate": "2025-01-31T23:59:59Z"},
            "success": {"status": 201, "body": {"id": 41, "code": "NYGLOW10"}},
            "errors": [(409, "Code exists", {"error": "Conflict", "message": "COUPON_CODE_EXISTS"})]
        },
        {
            "name": "Update coupon",
            "method": "PUT",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Updates coupon meta, schedule, or eligibility lists.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "New Year Glow", "discountValue": 12, "status": "ACTIVE"},
            "success": {"status": 200, "body": {"id": 41, "discountValue": 12}},
            "errors": []
        },
        {
            "name": "Delete coupon",
            "method": "DELETE",
            "path": "/{id}",
            "auth": "Bearer",
            "description": "Deletes a coupon immediately.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "Product reference options",
            "method": "GET",
            "path": "/reference/products",
            "auth": "Bearer",
            "description": "Searchable product dropdown used when targeting specific SKUs.",
            "params": [("search", "Optional name/SKU"), ("size", "Maximum results")],
            "success": {"status": 200, "body": [{"id": 101, "name": "Aurora Lamp", "sku": "AUR-LAMP-001"}]},
            "errors": []
        },
        {
            "name": "Category reference options",
            "method": "GET",
            "path": "/reference/categories",
            "auth": "Bearer",
            "description": "Searchable category dropdown for coupon targeting.",
            "params": [("search", "Optional name"), ("size", "Maximum results")],
            "success": {"status": 200, "body": [{"id": 3, "name": "Lighting"}]},
            "errors": []
        },
        {
            "name": "User reference options",
            "method": "GET",
            "path": "/reference/users",
            "auth": "Bearer",
            "description": "Searches verified users when issuing signup coupons to a subset of accounts.",
            "params": [("search", "Name or email"), ("size", "Maximum results")],
            "success": {"status": 200, "body": [{"id": 44, "name": "Priya S.", "email": "priya@example.com"}]},
            "errors": []
        }
    ]
})
modules.append({
    "file": "gallery.html",
    "title": "Media Gallery APIs",
    "summary": "Centralised asset library supporting upload, metadata, and folder management.",
    "base": "/api/v1/gallery",
    "endpoints": [
        {
            "name": "List files",
            "method": "GET",
            "path": "/files",
            "auth": "Bearer",
            "description": "Paginated media browser with folder, owner, uploader, and search filters.",
            "params": [("page", "Page index"), ("size", "Page size"), ("folderId", "Filter by folder"), ("search", "Filename search")],
            "success": {"status": 200, "body": page({"id": 901, "filename": "aurora-primary.jpg", "url": "https://cdn.example.com/gallery/aurora-primary.jpg", "sizeBytes": 245678})},
            "errors": []
        },
        {
            "name": "Get gallery settings",
            "method": "GET",
            "path": "/settings",
            "auth": "Bearer",
            "description": "Returns upload limits and default folders permitted for the requesting user.",
            "success": {"status": 200, "body": {"maxFileSizeBytes": 5242880, "allowedMimeTypes": ["image/png", "image/jpeg"]}},
            "errors": []
        },
        {
            "name": "Upload files",
            "method": "POST",
            "path": "/files",
            "auth": "Bearer",
            "description": "Uploads one or more files to the gallery, returning metadata for each stored asset.",
            "headers": [("Content-Type", "multipart/form-data")],
            "body": None,
            "success": {"status": 200, "body": [{"id": 902, "filename": "detail.jpg", "url": "https://cdn.example.com/gallery/detail.jpg", "sizeBytes": 198765}]},
            "errors": [(400, "No files provided", {"error": "Bad Request", "message": "FILES_REQUIRED"})]
        },
        {
            "name": "Update file metadata",
            "method": "PATCH",
            "path": "/files/{id}",
            "auth": "Bearer",
            "description": "Renames a file, changes its folder, or adjusts ownership notes.",
            "headers": [("Content-Type", "application/json")],
            "body": {"folderId": 18, "title": "Aurora lamp hero"},
            "success": {"status": 200, "body": {"id": 901, "folderId": 18}},
            "errors": []
        },
        {
            "name": "Delete file",
            "method": "DELETE",
            "path": "/files/{id}",
            "auth": "Bearer",
            "description": "Deletes a single file if the caller owns it or has global permissions.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "Bulk delete",
            "method": "POST",
            "path": "/files/bulk-delete",
            "auth": "Bearer",
            "description": "Deletes multiple files by id in a single operation.",
            "headers": [("Content-Type", "application/json")],
            "body": {"ids": [901, 902, 903]},
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "Download file",
            "method": "GET",
            "path": "/files/{id}/content",
            "auth": "Bearer",
            "description": "Streams the binary content of the requested gallery item.",
            "success": {"status": 200, "body": None},
            "errors": [(404, "File missing", {"error": "Not Found", "message": "GALLERY_FILE_NOT_FOUND"})]
        },
        {
            "name": "List folders",
            "method": "GET",
            "path": "/folders",
            "auth": "Bearer",
            "description": "Returns accessible folder tree for the authenticated user.",
            "success": {"status": 200, "body": [{"id": 12, "name": "Products", "children": []}]},
            "errors": []
        },
        {
            "name": "Create folder",
            "method": "POST",
            "path": "/folders",
            "auth": "Bearer",
            "description": "Creates a new folder optionally nested inside an existing folder.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "PDP", "parentId": 12},
            "success": {"status": 201, "body": {"id": 18, "name": "PDP"}},
            "errors": []
        },
        {
            "name": "Rename folder",
            "method": "PATCH",
            "path": "/folders/{id}",
            "auth": "Bearer",
            "description": "Renames an existing folder.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Product Detail"},
            "success": {"status": 200, "body": {"id": 18, "name": "Product Detail"}},
            "errors": []
        },
        {
            "name": "Delete folder",
            "method": "DELETE",
            "path": "/folders/{id}",
            "auth": "Bearer",
            "description": "Deletes a folder when empty or when cascading delete is permitted.",
            "success": {"status": 204, "body": None},
            "errors": []
        }
    ]
})
modules.append({
    "file": "settings.html",
    "title": "Platform Settings APIs",
    "summary": "Storefront configuration, email settings, and template management.",
    "base": "/api/v1/settings",
    "endpoints": [
        {
            "name": "Get settings",
            "method": "GET",
            "path": "",
            "auth": "Bearer",
            "description": "Returns global store configuration including currency and contact details.",
            "success": {"status": 200, "body": {"storeName": "Glow Commerce", "currency": "USD", "supportEmail": "support@example.com", "maintenanceMode": False}},
            "errors": []
        },
        {
            "name": "Update settings",
            "method": "PATCH",
            "path": "",
            "auth": "Bearer",
            "description": "Updates general settings fields supplied in the request body.",
            "headers": [("Content-Type", "application/json")],
            "body": {"storeName": "Glow Commerce", "maintenanceMode": False},
            "success": {"status": 200, "body": {"storeName": "Glow Commerce", "maintenanceMode": False}},
            "errors": []
        },
        {
            "name": "Get public theme",
            "method": "GET",
            "path": "/theme",
            "auth": "Public",
            "description": "Returns the storefront theme tokens for anonymous rendering.",
            "success": {"status": 200, "body": {"primary": "#38bdf8", "secondary": "#0f172a", "logoUrl": "https://cdn.example.com/theme/logo.svg"}},
            "errors": []
        },
        {
            "name": "Get email settings",
            "method": "GET",
            "path": "/email",
            "auth": "Bearer",
            "description": "Returns SMTP or transactional email configuration.",
            "success": {"status": 200, "body": {"provider": "SMTP", "host": "smtp.example.com", "port": 587, "fromAddress": "no-reply@example.com"}},
            "errors": []
        },
        {
            "name": "Send test email",
            "method": "POST",
            "path": "/email/test",
            "auth": "Bearer",
            "description": "Sends a test email using the current settings to validate connectivity.",
            "headers": [("Content-Type", "application/json")],
            "body": {"to": "qa@example.com"},
            "success": {"status": 200, "body": {"delivered": True, "messageId": "20250115-abc"}},
            "errors": [(400, "SMTP failure", {"error": "Bad Request", "message": "SMTP_AUTH_FAILED"})]
        },
        {
            "name": "List email templates",
            "method": "GET",
            "path": "/email/templates",
            "auth": "Bearer",
            "description": "Returns available system email templates grouped by category.",
            "success": {"status": 200, "body": {"templates": [{"id": 1, "name": "Order Confirmation", "code": "ORDER_CONFIRMATION"}]}}
        },
        {
            "name": "Get email template",
            "method": "GET",
            "path": "/email/templates/{id}",
            "auth": "Bearer",
            "description": "Loads template subject and body for editing.",
            "success": {"status": 200, "body": {"id": 1, "name": "Order Confirmation", "subject": "Your order is confirmed"}},
            "errors": []
        },
        {
            "name": "Update email template",
            "method": "PUT",
            "path": "/email/templates/{id}",
            "auth": "Bearer",
            "description": "Updates template subject, HTML, and plain text body.",
            "headers": [("Content-Type", "application/json")],
            "body": {"subject": "Thanks for your purchase", "htmlBody": "<p>Hello {{customerName}}</p>"},
            "success": {"status": 200, "body": {"id": 1, "updated": True}},
            "errors": []
        }
    ]
})
modules.append({
    "file": "shipping.html",
    "title": "Shipping & Logistics APIs",
    "summary": "Manage shippable regions, granular rate cards, and delivery rules.",
    "base": "/api/v1/shipping",
    "endpoints": [
        {
            "name": "List countries",
            "method": "GET",
            "path": "/countries",
            "auth": "Bearer",
            "description": "Returns countries configured for fulfilment including enablement flags.",
            "success": {"status": 200, "body": [{"id": 1, "code": "US", "name": "United States", "enabled": True}]},
            "errors": []
        },
        {
            "name": "Create country",
            "method": "POST",
            "path": "/countries",
            "auth": "Bearer",
            "description": "Adds a new shippable country with optional cash-on-delivery settings.",
            "headers": [("Content-Type", "application/json")],
            "body": {"code": "CA", "name": "Canada", "enabled": True},
            "success": {"status": 201, "body": {"id": 2, "code": "CA"}},
            "errors": []
        },
        {
            "name": "Update country",
            "method": "PUT",
            "path": "/countries/{id}",
            "auth": "Bearer",
            "description": "Updates country-level toggles like enablement, COD allowance, and max weight.",
            "headers": [("Content-Type", "application/json")],
            "body": {"enabled": False, "allowCod": False},
            "success": {"status": 200, "body": {"id": 1, "enabled": False}},
            "errors": []
        },
        {
            "name": "Bulk country settings",
            "method": "PUT",
            "path": "/countries/bulk-settings",
            "auth": "Bearer",
            "description": "Applies shared configuration to multiple countries in one call.",
            "headers": [("Content-Type", "application/json")],
            "body": {"countryIds": [1, 2], "defaultSlaDays": 4},
            "success": {"status": 200, "body": [{"id": 1, "defaultSlaDays": 4}, {"id": 2, "defaultSlaDays": 4}]},
            "errors": []
        },
        {
            "name": "Delete country",
            "method": "DELETE",
            "path": "/countries/{id}",
            "auth": "Bearer",
            "description": "Deletes a country and cascades to contained states/cities if configured.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "List states",
            "method": "GET",
            "path": "/countries/{countryId}/states",
            "auth": "Bearer",
            "description": "Returns states/provinces for the specified country.",
            "success": {"status": 200, "body": [{"id": 10, "code": "CA-ON", "name": "Ontario", "enabled": True}]},
            "errors": []
        },
        {
            "name": "Create state",
            "method": "POST",
            "path": "/countries/{countryId}/states",
            "auth": "Bearer",
            "description": "Creates a state inside the given country.",
            "headers": [("Content-Type", "application/json")],
            "body": {"code": "CA-BC", "name": "British Columbia", "enabled": True},
            "success": {"status": 201, "body": {"id": 11, "countryId": 2}},
            "errors": []
        },
        {
            "name": "Update state",
            "method": "PUT",
            "path": "/states/{id}",
            "auth": "Bearer",
            "description": "Updates state level toggles or surcharge overrides.",
            "headers": [("Content-Type", "application/json")],
            "body": {"enabled": False, "defaultSlaDays": 3},
            "success": {"status": 200, "body": {"id": 10, "enabled": False, "defaultSlaDays": 3}},
            "errors": []
        },
        {
            "name": "Delete state",
            "method": "DELETE",
            "path": "/states/{id}",
            "auth": "Bearer",
            "description": "Deletes a state and optionally cascades to cities.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "List cities",
            "method": "GET",
            "path": "/states/{stateId}/cities",
            "auth": "Bearer",
            "description": "Returns configured cities for the given state.",
            "success": {"status": 200, "body": [{"id": 201, "name": "Toronto", "postalCodes": ["M5H", "M5V"], "enabled": True}]},
            "errors": []
        },
        {
            "name": "Create city",
            "method": "POST",
            "path": "/states/{stateId}/cities",
            "auth": "Bearer",
            "description": "Creates a city under the given state including postal code coverage.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Vancouver", "postalCodes": ["V5K", "V6B"], "enabled": True},
            "success": {"status": 201, "body": {"id": 202, "stateId": 11}},
            "errors": []
        },
        {
            "name": "Update city",
            "method": "PUT",
            "path": "/cities/{id}",
            "auth": "Bearer",
            "description": "Updates city level toggles or surcharges.",
            "headers": [("Content-Type", "application/json")],
            "body": {"enabled": False, "defaultSlaDays": 2},
            "success": {"status": 200, "body": {"id": 201, "enabled": False}},
            "errors": []
        },
        {
            "name": "Delete city",
            "method": "DELETE",
            "path": "/cities/{id}",
            "auth": "Bearer",
            "description": "Deletes a city and removes associated postal codes.",
            "success": {"status": 204, "body": None},
            "errors": []
        },
        {
            "name": "List shipping area rates",
            "method": "GET",
            "path": "/area-rates",
            "auth": "Bearer",
            "description": "Paginated rate cards scoped by shipping area.",
            "params": [("page", "Page index"), ("size", "Page size"), ("search", "Optional search")],
            "success": {"status": 200, "body": page({"id": 70, "name": "US Standard", "baseRate": 5.99})},
            "errors": []
        },
        {
            "name": "Create shipping area rate",
            "method": "POST",
            "path": "/area-rates",
            "auth": "Bearer",
            "description": "Creates a new shipping rate with thresholds and surcharge rules.",
            "headers": [("Content-Type", "application/json")],
            "body": {"name": "Canada Express", "baseRate": 12.5, "minWeight": 0, "maxWeight": 5},
            "success": {"status": 201, "body": {"id": 71, "name": "Canada Express"}},
            "errors": []
        },
        {
            "name": "Update shipping area rate",
            "method": "PUT",
            "path": "/area-rates/{id}",
            "auth": "Bearer",
            "description": "Updates base rate, thresholds, or surcharges for an area rate.",
            "headers": [("Content-Type", "application/json")],
            "body": {"baseRate": 9.99, "maxWeight": 7},
            "success": {"status": 200, "body": {"id": 70, "baseRate": 9.99}},
            "errors": []
        },
        {
            "name": "Delete shipping area rate",
            "method": "DELETE",
            "path": "/area-rates/{id}",
            "auth": "Bearer",
            "description": "Deletes a rate card.",
            "success": {"status": 204, "body": None},
            "errors": []
        }
    ]
})
modules.append({
    "file": "public.html",
    "title": "Public Storefront APIs",
    "summary": "Anonymous endpoints powering the storefront product listings, detail pages, and promotions.",
    "base": "/api/v1/public",
    "endpoints": [
        {
            "name": "Homepage content blocks",
            "method": "GET",
            "path": "/home",
            "auth": "Public",
            "description": "Returns hero banners, featured categories, and spotlight collections for the storefront landing page.",
            "success": {"status": 200, "body": {"hero": {"title": "Glow up your space", "cta": "Shop lighting"}, "featuredCategories": [{"name": "Lighting", "slug": "lighting"}]}},
            "errors": []
        },
        {
            "name": "List public products",
            "method": "GET",
            "path": "/products",
            "auth": "Public",
            "description": "Searchable storefront catalogue with pagination, sorting, and filter facets.",
            "params": [("page", "Page index"), ("size", "Page size"), ("search", "Name or SKU"), ("category", "Category slug"), ("sort", "price, -price, newest")],
            "success": {"status": 200, "body": page({"id": 101, "name": "Aurora Lamp", "slug": "aurora-lamp", "price": 129.0, "thumbnail": "https://cdn.example.com/products/aurora/primary.jpg"})},
            "errors": []
        },
        {
            "name": "Get product by slug",
            "method": "GET",
            "path": "/products/{slug}",
            "auth": "Public",
            "description": "Returns full PDP payload including pricing, variants, offers, reviews, and recommendations.",
            "success": {"status": 200, "body": {"id": 101, "name": "Aurora Lamp", "slug": "aurora-lamp", "offers": [{"code": "NYGLOW10", "discount": "10% off"}], "variants": [{"sku": "AUR-LAMP-001", "attributes": {"Color": "Pearl"}}]}},
            "errors": [(404, "Product not found", {"error": "Not Found", "message": "PRODUCT_NOT_FOUND"})]
        },
        {
            "name": "List public categories",
            "method": "GET",
            "path": "/categories",
            "auth": "Public",
            "description": "Returns visible storefront categories including hero imagery.",
            "success": {"status": 200, "body": [{"name": "Lighting", "slug": "lighting", "image": "https://cdn.example.com/categories/lighting/hero.jpg"}]},
            "errors": []
        },
        {
            "name": "Active coupons",
            "method": "GET",
            "path": "/coupons",
            "auth": "Public",
            "description": "Lists active coupons with display copy and eligible product/category references.",
            "params": [("productId", "Optional product id to filter"), ("categoryId", "Optional category id")],
            "success": {"status": 200, "body": page({"name": "Glow Intro", "code": "GLOW5", "type": "CART", "description": "Save $5 on orders over $50"})},
            "errors": []
        },
        {
            "name": "Recently viewed products",
            "method": "GET",
            "path": "/recently-viewed",
            "auth": "Public",
            "description": "Returns the last viewed products for the current session or authenticated customer.",
            "success": {"status": 200, "body": [{"id": 101, "name": "Aurora Lamp", "slug": "aurora-lamp", "lastViewedAt": "2025-10-15T19:55:00Z"}]},
            "errors": []
        }
    ]
})

for module in modules:
    module["group"] = MODULE_GROUPS.get(module["file"], "Admin")
    module["slug"] = slug_for(module["file"])
    write_module(module)

write_index(modules)
write_postman_collection(modules)

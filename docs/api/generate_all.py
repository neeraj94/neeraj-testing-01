import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
BACKEND_SRC = REPO_ROOT / "backend" / "src" / "main" / "java"

from _builder import write_module

HTTP_METHODS = {
    "GetMapping": "GET",
    "PostMapping": "POST",
    "PutMapping": "PUT",
    "PatchMapping": "PATCH",
    "DeleteMapping": "DELETE",
}

DEFAULT_STATUS = {
    "GET": 200,
    "POST": 201,
    "PUT": 200,
    "PATCH": 200,
    "DELETE": 204,
}

RESPONSE_STATUS_MAP = {
    "HttpStatus.OK": 200,
    "HttpStatus.CREATED": 201,
    "HttpStatus.ACCEPTED": 202,
    "HttpStatus.NO_CONTENT": 204,
    "HttpStatus.RESET_CONTENT": 205,
    "HttpStatus.PARTIAL_CONTENT": 206,
}

MEDIA_TYPE_ALIASES = {
    "MediaType.APPLICATION_JSON_VALUE": "application/json",
    "MediaType.MULTIPART_FORM_DATA_VALUE": "multipart/form-data",
    "MediaType.APPLICATION_FORM_URLENCODED_VALUE": "application/x-www-form-urlencoded",
}


@dataclass
class Endpoint:
    name: str
    method: str
    path: str
    description: str
    params: List[Tuple[str, str]]
    headers: List[Tuple[str, str]]
    auth: str
    body: Optional[object]
    success_status: int
    consumes: Optional[str] = None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return slug.strip("-") or "index"


def humanize(value: str) -> str:
    words = re.sub(r"(?<!^)(?=[A-Z])", " ", value).replace("_", " ")
    words = re.sub(r"\s+", " ", words).strip()
    if not words:
        return value
    return words[0].upper() + words[1:]


def normalise_base_path(raw: Optional[str]) -> str:
    if not raw:
        return "/"
    cleaned = raw.strip().strip("\"")
    if not cleaned.startswith("/"):
        cleaned = f"/{cleaned}"
    if len(cleaned) > 1 and cleaned.endswith("/"):
        cleaned = cleaned[:-1]
    return cleaned


def extract_first_string(annotation: str) -> Optional[str]:
    matches = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', annotation)
    if not matches:
        return None
    return matches[0]


def extract_attribute(annotation: str, attribute: str) -> Optional[str]:
    pattern = rf"{attribute}\s*=\s*(.+?)(?:,|\))"
    match = re.search(pattern, annotation)
    if not match:
        return None
    value = match.group(1).strip()
    if value.startswith('"') and value.endswith('"'):
        return value.strip('"')
    return MEDIA_TYPE_ALIASES.get(value, value)


def parse_mapping(annotation: str) -> Optional[Dict[str, Optional[str]]]:
    for decorator, method in HTTP_METHODS.items():
        if annotation.startswith(f"@{decorator}"):
            path = extract_first_string(annotation) or ""
            consumes = extract_attribute(annotation, "consumes")
            produces = extract_attribute(annotation, "produces")
            return {"method": method, "path": path, "consumes": consumes, "produces": produces}
    if annotation.startswith("@RequestMapping"):
        raw_method = extract_attribute(annotation, "method")
        http_method = None
        if raw_method:
            parts = re.findall(r"RequestMethod\.([A-Z]+)", raw_method)
            if parts:
                http_method = parts[0]
        path = extract_first_string(annotation) or ""
        consumes = extract_attribute(annotation, "consumes")
        produces = extract_attribute(annotation, "produces")
        return {"method": http_method, "path": path, "consumes": consumes, "produces": produces}
    return None


def parse_response_status(annotations: Iterable[str], http_method: str) -> int:
    for annotation in annotations:
        if annotation.startswith("@ResponseStatus"):
            for key, value in RESPONSE_STATUS_MAP.items():
                if key in annotation:
                    return value
            match = extract_first_string(annotation)
            if match and match.isdigit():
                return int(match)
    return DEFAULT_STATUS.get(http_method, 200)


def extract_class_metadata(text: str) -> Tuple[str, str]:
    class_match = re.search(r"class\s+(\w+)", text)
    if not class_match:
        raise ValueError("Controller class name not found")
    class_name = class_match.group(1)
    before_class = text[: class_match.start()]
    request_match = re.search(r"@RequestMapping\(([^)]*)\)", before_class)
    base_path = None
    if request_match:
        base_path = extract_first_string(request_match.group(0))
        if not base_path:
            base_path = extract_attribute(request_match.group(0), "value")
    return class_name, normalise_base_path(base_path)


def split_parameters(param_block: str) -> List[str]:
    params = []
    current = []
    depth_angle = 0
    depth_paren = 0
    for char in param_block:
        if char == '<':
            depth_angle += 1
        elif char == '>':
            depth_angle = max(0, depth_angle - 1)
        elif char == '(':  # nested lambda or annotation
            depth_paren += 1
        elif char == ')':
            depth_paren = max(0, depth_paren - 1)
        if char == ',' and depth_angle == 0 and depth_paren == 0:
            params.append(''.join(current).strip())
            current = []
        else:
            current.append(char)
    if current:
        params.append(''.join(current).strip())
    return [param for param in params if param]


def extract_annotation_snippet(segment: str) -> Tuple[List[str], str]:
    annotations = []
    remaining = segment.strip()
    while remaining.startswith('@'):
        depth = 0
        idx = 0
        for idx, char in enumerate(remaining):
            if char == '(':
                depth += 1
            elif char == ')':
                depth = max(0, depth - 1)
            elif char == ' ' and depth == 0:
                break
        else:
            idx = len(remaining)
        annotation = remaining[: idx + (0 if idx == len(remaining) else 1)].strip()
        annotations.append(annotation)
        remaining = remaining[len(annotation):].strip()
    return annotations, remaining


def extract_variable_name(segment: str) -> str:
    tokens = segment.strip().split()
    if not tokens:
        return "value"
    var = tokens[-1]
    var = var.rstrip(",)")
    return var.replace("[]", "")


def analyse_parameters(param_block: str) -> Tuple[List[Tuple[str, str]], List[Tuple[str, str]], bool, List[str]]:
    params: List[Tuple[str, str]] = []
    headers: List[Tuple[str, str]] = []
    form_fields: List[str] = []
    has_body = False
    for raw_param in split_parameters(param_block):
        annotations, remainder = extract_annotation_snippet(raw_param)
        name = extract_variable_name(remainder)
        annotation_lookup = {ann.split('(')[0]: ann for ann in annotations}

        if any(ann.startswith("@RequestBody") or ann.startswith("@RequestPart") for ann in annotations):
            has_body = True
            provided = None
            for ann in annotations:
                if ann.startswith("@RequestPart"):
                    provided = extract_first_string(ann)
                    break
            if provided:
                form_fields.append(provided)
            continue

        if "@PathVariable" in annotation_lookup:
            ann = annotation_lookup["@PathVariable"]
            provided = extract_first_string(ann)
            param_name = provided or name
            params.append((param_name, "Path parameter"))
            continue

        if "@RequestParam" in annotation_lookup:
            ann = annotation_lookup["@RequestParam"]
            provided = extract_first_string(ann)
            param_name = provided or extract_attribute(ann, "name") or extract_attribute(ann, "value") or name
            required_attr = extract_attribute(ann, "required")
            optional_note = " (optional)" if required_attr and required_attr.lower() == "false" else ""
            if 'MultipartFile' in remainder or 'Part<' in remainder:
                has_body = True
                form_fields.append(param_name)
                params.append((param_name, f"Form field{optional_note}"))
            else:
                params.append((param_name, f"Query parameter{optional_note}"))
            continue

        if "@RequestHeader" in annotation_lookup:
            ann = annotation_lookup["@RequestHeader"]
            provided = extract_first_string(ann)
            header_name = provided or extract_attribute(ann, "name") or extract_attribute(ann, "value") or name
            headers.append((header_name, "Supplied via request header"))
            continue

    return params, headers, has_body, form_fields


def extract_method_signature(lines: List[str], start_index: int) -> Tuple[str, int]:
    signature_parts = []
    depth = 0
    index = start_index
    while index < len(lines):
        line = lines[index].strip()
        signature_parts.append(line)
        depth += line.count('(') - line.count(')')
        if depth <= 0 and line.endswith('{'):
            break
        index += 1
    signature = ' '.join(signature_parts)
    return signature, index


def extract_method_name(signature: str) -> Optional[str]:
    match = re.search(r"public\s+(?:static\s+)?[\w<>,\s\[\]?]+\s+(\w+)\s*\(", signature)
    if match:
        return match.group(1)
    return None


def extract_parameter_block(signature: str) -> str:
    start = signature.find('(')
    if start == -1:
        return ""
    depth = 0
    for index in range(start, len(signature)):
        char = signature[index]
        if char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
            if depth == 0:
                return signature[start + 1: index]
    return ""


def build_endpoint(annotations: List[str], signature: str, base_path: str, class_name: str) -> Optional[Endpoint]:
    mapping = None
    consumes = None
    produces = None
    for annotation in annotations:
        parsed = parse_mapping(annotation)
        if parsed and parsed.get("method"):
            mapping = parsed
            consumes = consumes or parsed.get("consumes")
            produces = produces or parsed.get("produces")
        elif parsed and not mapping:
            mapping = parsed
            consumes = consumes or parsed.get("consumes")
            produces = produces or parsed.get("produces")

    if not mapping or not mapping.get("method"):
        return None

    http_method = mapping["method"].upper()
    sub_path = mapping.get("path") or ""
    if sub_path and not sub_path.startswith('/'):
        sub_path = f"/{sub_path}"

    method_name = extract_method_name(signature) or f"{http_method.lower()}_{slugify(sub_path or 'root')}"
    readable_path = sub_path or '/'
    description = f"{humanize(method_name)} handler in {class_name} for {http_method} {readable_path} requests."

    param_block = extract_parameter_block(signature)
    params, header_params, has_body, form_fields = analyse_parameters(param_block)

    headers: List[Tuple[str, str]] = []
    if consumes:
        headers.append(("Content-Type", consumes))
    elif has_body and http_method in {"POST", "PUT", "PATCH"} and not form_fields:
        headers.append(("Content-Type", "application/json"))
    headers.extend(header_params)

    auth = "Public"
    for annotation in annotations:
        if annotation.startswith("@PreAuthorize"):
            if "permitAll" in annotation or "isAnonymous" in annotation:
                auth = "Public"
            else:
                auth = "Bearer"

    success_status = parse_response_status(annotations, http_method)
    body_example: Optional[object]
    if form_fields:
        if consumes is None:
            consumes = 'multipart/form-data'
            headers.append(("Content-Type", consumes))
        body_example = '\n'.join(f"{field}=<value>" for field in form_fields)
    elif has_body:
        body_example = '{}'
    else:
        body_example = None

    deduped_headers: List[Tuple[str, str]] = []
    seen_pairs = set()
    for key, value in headers:
        pair = (key.lower(), value)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        deduped_headers.append((key, value))

    return Endpoint(
        name=humanize(method_name),
        method=http_method,
        path=sub_path,
        description=description,
        params=params,
        headers=deduped_headers,
        auth=auth,
        body=body_example,
        success_status=success_status,
        consumes=consumes,
    )


def parse_controller(path: Path) -> Optional[Dict]:
    text = path.read_text()
    class_name, base_path = extract_class_metadata(text)
    lines = text.splitlines()
    annotations: List[str] = []
    endpoints: List[Endpoint] = []
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if stripped.startswith('@'):
            annotation = stripped
            while annotation.count('(') > annotation.count(')'):
                index += 1
                annotation += ' ' + lines[index].strip()
            annotations.append(annotation)
            index += 1
            continue

        if annotations and 'public' in stripped and '(' in stripped and not stripped.startswith('public class'):
            signature, index = extract_method_signature(lines, index)
            endpoint = build_endpoint(annotations, signature, base_path, class_name)
            if endpoint:
                endpoints.append(endpoint)
            annotations = []
            index += 1
            continue

        annotations = []
        index += 1

    if not endpoints:
        return None

    controller_name = class_name[:-10] if class_name.endswith('Controller') else class_name
    title = humanize(controller_name)
    slug = slugify(controller_name)
    summary = f"Endpoints implemented by the {title} controller."

    endpoint_dicts = []
    for endpoint in endpoints:
        endpoint_dicts.append(
            {
                "name": endpoint.name,
                "method": endpoint.method,
                "path": endpoint.path,
                "description": endpoint.description,
                "params": endpoint.params,
                "headers": endpoint.headers,
                "auth": endpoint.auth,
                "body": endpoint.body,
                "success": {"status": endpoint.success_status, "body": None},
                "errors": [],
            }
        )

    return {
        "file": f"{slug}.html",
        "slug": slug,
        "title": f"{title} APIs",
        "summary": summary,
        "base": base_path,
        "endpoints": endpoint_dicts,
    }


def write_index(modules: List[Dict]) -> None:
    modules_sorted = sorted(modules, key=lambda item: item["title"].lower())
    nav_items = []
    cards = []
    for module in modules_sorted:
        anchor = f"module-{module['slug']}"
        nav_items.append(
            f"<li><a href=\"#{anchor}\" data-endpoint-link=\"{anchor}\">{module['title']}</a></li>\n"
        )
        endpoint_list = ''.join(
            f"<li><span class=\"sidebar__method\">{html_escape(ep['method'])}</span>"
            f"<code>{html_escape(module['base'] + ep['path'])}</code></li>"
            for ep in module['endpoints'][:6]
        )
        more_hint = ''
        if len(module['endpoints']) > 6:
            more_hint = f"<p class=\"module-card__more\">…and {len(module['endpoints']) - 6} more endpoints.</p>"
        card_html = (
            f"<article class=\"module-card\" id=\"{anchor}\">"
            f"<h3>{html_escape(module['title'])}</h3>"
            f"<p>{html_escape(module['summary'])}</p>"
            f"<p class=\"module-card__path\">Base path: <code>{html_escape(module['base'])}</code></p>"
            f"<ul class=\"module-card__endpoints\">{endpoint_list}</ul>"
            f"<p><a class=\"button button--inline\" href=\"{module['file']}\">Open reference</a></p>"
            f"{more_hint}"
            "</article>"
        )
        cards.append(card_html + "\n")

    index_html = INDEX_TEMPLATE.format(
        nav_items=''.join(nav_items),
        cards=''.join(cards),
    )
    (CURRENT_DIR / "index.html").write_text(index_html)


def html_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


INDEX_TEMPLATE = """<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <title>API Reference</title>\n    <link rel=\"stylesheet\" href=\"styles.css\" />\n  </head>\n  <body class=\"page\">\n    <div class=\"docs\">\n      <aside class=\"docs__nav sidebar\" aria-label=\"API navigation\">\n        <div class=\"sidebar__brand\">\n          <div class=\"sidebar__badge\">RBAC Commerce</div>\n          <h1>API Reference</h1>\n          <p>Auto-generated documentation for every controller endpoint exposed by the RBAC Commerce backend.</p>\n        </div>\n        <div class=\"sidebar__controls\">\n          <label class=\"control\">\n            <span class=\"control__label\">Environment</span>\n            <select id=\"environmentSelect\">\n              <option value=\"https://sandbox.api.rbac-commerce.dev\">Sandbox</option>\n              <option value=\"https://staging.api.rbac-commerce.dev\">Staging</option>\n              <option value=\"https://api.rbac-commerce.dev\">Production</option>\n              <option value=\"custom\">Custom…</option>\n            </select>\n          </label>\n          <label class=\"control\" id=\"customUrlControl\" hidden>\n            <span class=\"control__label\">Custom base URL</span>\n            <input id=\"baseUrl\" type=\"url\" spellcheck=\"false\" value=\"https://sandbox.api.rbac-commerce.dev\" />\n          </label>\n          <label class=\"control\">\n            <span class=\"control__label\">Bearer token</span>\n            <input id=\"authToken\" type=\"text\" spellcheck=\"false\" placeholder=\"Optional token for private endpoints\" />\n          </label>\n        </div>\n        <nav class=\"sidebar__nav\" aria-label=\"Controllers\">\n          <h2>Controllers</h2>\n          <ul class=\"sidebar__tree\" role=\"tree\">\n            {nav_items}\n          </ul>\n        </nav>\n      </aside>\n      <main class=\"docs__content content\" id=\"docsContent\" tabindex=\"-1\">\n        <header class=\"hero\">\n          <h2>Design, test, and ship with confidence</h2>\n          <p>Each module is derived from the live Spring controllers. Open a controller to explore every route, generate cURL examples, and execute requests without leaving the docs.</p>\n          <p><strong>Selected base URL:</strong> <span data-base-display>https://sandbox.api.rbac-commerce.dev</span></p>\n        </header>\n        <section class=\"module-grid\">\n          {cards}\n        </section>\n      </main>\n    </div>\n    <footer class=\"docs__footer\">\n      <p>Documentation generated from source on demand.</p>\n    </footer>\n    <script src=\"app.js\" defer></script>\n  </body>\n</html>\n"""


def main() -> None:
    controller_files = sorted(BACKEND_SRC.rglob("*Controller.java"))
    modules: List[Dict] = []
    for controller_path in controller_files:
        try:
            module = parse_controller(controller_path)
        except Exception as error:  # pragma: no cover - defensive logging
            print(f"Skipping {controller_path}: {error}")
            continue
        if module:
            modules.append(module)

    if not modules:
        raise SystemExit("No controllers were discovered; cannot build docs.")

    for module in modules:
        write_module(module)

    write_index(modules)
    print(f"Generated {len(modules)} controller modules.")


if __name__ == "__main__":
    main()

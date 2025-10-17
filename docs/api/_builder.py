from pathlib import Path
import json
import html

TEMPLATE = """<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>{title}</title>\n    <link rel=\"stylesheet\" href=\"styles.css\" />\n  </head>\n  <body class=\"page\">\n    <div class=\"docs\">\n      <aside class=\"docs__nav sidebar\" aria-label=\"API navigation\">\n        <div class=\"sidebar__brand\">\n          <div class=\"sidebar__badge\">RBAC Commerce</div>\n          <h1>{title}</h1>\n          <p>{summary}</p>\n          <p class=\"sidebar__hint\">Base path: <code>{base}</code></p>\n        </div>\n        <div class=\"sidebar__controls\">\n          <label class=\"control\">\n            <span class=\"control__label\">Environment</span>\n            <select id=\"environmentSelect\">\n              <option value=\"https://sandbox.api.rbac-commerce.dev\">Sandbox</option>\n              <option value=\"https://staging.api.rbac-commerce.dev\">Staging</option>\n              <option value=\"https://api.rbac-commerce.dev\">Production</option>\n              <option value=\"custom\">Custom…</option>\n            </select>\n          </label>\n          <label class=\"control\" id=\"customUrlControl\" hidden>\n            <span class=\"control__label\">Custom base URL</span>\n            <input id=\"baseUrl\" type=\"url\" spellcheck=\"false\" value=\"https://sandbox.api.rbac-commerce.dev\" />\n          </label>\n          <label class=\"control\">\n            <span class=\"control__label\">Bearer token</span>\n            <input id=\"authToken\" type=\"text\" spellcheck=\"false\" placeholder=\"Optional token for private endpoints\" />\n          </label>\n        </div>\n        <nav class=\"sidebar__nav\" aria-label=\"Endpoints\">\n          <h2>Endpoints</h2>\n          <ul class=\"sidebar__tree\" role=\"tree\">\n            {nav_items}\n          </ul>\n        </nav>\n      </aside>\n      <main class=\"docs__content content\" id=\"docsContent\" tabindex=\"-1\">\n        <header class=\"hero\">\n          <h2>{title}</h2>\n          <p>{summary}</p>\n          <p><strong>Selected base URL:</strong> <span data-base-display>https://sandbox.api.rbac-commerce.dev</span></p>\n        </header>\n        {sections}\n      </main>\n    </div>\n    <footer class=\"docs__footer\">\n      <a href=\"index.html\">Back to index</a>\n    </footer>\n    <script src=\"app.js\" defer></script>\n  </body>\n</html>\n"""

SECTION = """<article class=\"endpoint\" id=\"{anchor}\" data-endpoint-id=\"{anchor}\" data-method=\"{method}\" data-base-path=\"{base_path}\" data-path=\"{path}\" data-auth=\"{auth}\"{headers_attr}{body_attr}>\n  <div class=\"endpoint__header\">\n    <div class=\"endpoint__title\">\n      <span class=\"http-badge http-badge--{method_class}\">{method}</span>\n      <div>\n        <h3>{name}</h3>\n        <p><code>{full_path}</code></p>\n      </div>\n    </div>\n  </div>\n  <div class=\"endpoint__layout\">\n    <div class=\"endpoint__body\">\n      <section class=\"endpoint__section\">\n        <h4>Summary</h4>\n        <p>{description}</p>\n      </section>\n      {params}\n      {headers}\n      {body}\n      <section class=\"endpoint__section\">\n        <h4>Success response</h4>\n        <p class=\"status success\">HTTP {success_status}</p>\n        {success_body}\n      </section>\n      <section class=\"endpoint__section\">\n        <h4>Error scenarios</h4>\n        {error_table}\n      </section>\n    </div>\n    <div class=\"endpoint__panels\">\n      <section class=\"panel\">\n        <header class=\"panel__header\">\n          <h4>cURL samples</h4>\n          <span class=\"panel__format\">Interpolates current environment</span>\n        </header>\n        <div class=\"code-samples\" data-endpoint=\"{anchor}\">\n          <div class=\"code-samples__tabs\" role=\"tablist\">\n            <button type=\"button\" class=\"code-samples__tab is-active\" role=\"tab\" id=\"{anchor}-bash-tab\" aria-selected=\"true\" data-tab-target=\"{anchor}-bash\">bash/zsh</button>\n            <button type=\"button\" class=\"code-samples__tab\" role=\"tab\" id=\"{anchor}-powershell-tab\" aria-selected=\"false\" data-tab-target=\"{anchor}-powershell\">PowerShell/CMD</button>\n          </div>\n          <pre id=\"{anchor}-bash\" class=\"code-block\" role=\"tabpanel\" aria-labelledby=\"{anchor}-bash-tab\" data-template=\"curl-bash\" data-endpoint=\"{anchor}\"></pre>\n          <pre id=\"{anchor}-powershell\" class=\"code-block is-hidden\" role=\"tabpanel\" aria-labelledby=\"{anchor}-powershell-tab\" data-template=\"curl-powershell\" data-endpoint=\"{anchor}\" hidden></pre>\n          <div class=\"panel__actions\">\n            <button type=\"button\" class=\"copy-button\" data-copy>Copy</button>\n          </div>\n        </div>\n      </section>\n    </div>\n  </div>\n</article>\n"""

HEADER_SECTION = """<section class=\"endpoint__section\">\n  <h4>Headers</h4>\n  <table>\n    <thead><tr><th>Name</th><th>Value</th></tr></thead>\n    <tbody>{rows}</tbody>\n  </table>\n</section>\n"""

PARAM_SECTION = """<section class=\"endpoint__section\">\n  <h4>Parameters</h4>\n  <table>\n    <thead><tr><th>Name</th><th>Description</th></tr></thead>\n    <tbody>{rows}</tbody>\n  </table>\n</section>\n"""

ERROR_TABLE = """<table>\n  <thead><tr><th>Status</th><th>Description</th><th>Example</th></tr></thead>\n  <tbody>{rows}</tbody>\n</table>\n"""


def _attribute_from_json(name: str, data) -> str:
    if data is None:
        return f" data-{name}='null'"
    return f" data-{name}='{html.escape(json.dumps(data))}'"


def write_module(module: dict) -> None:
    nav_items = []
    sections = []
    for ep in module['endpoints']:
        path_fragment = ep['path'].strip('/').replace('/', '-') or 'root'
        path_fragment = path_fragment.replace('{', '').replace('}', '')
        anchor = f"{ep['method'].lower()}-{path_fragment}"
        nav_items.append(
            "<li role=\"treeitem\">"
            f"<a href=\"#{anchor}\" data-endpoint-link=\"{anchor}\">"
            f"<span class=\"sidebar__method\">{html.escape(ep['method'])}</span>"
            f"{html.escape(ep['name'])}</a>"
            "</li>"
        )

        header_rows = ''
        headers_attr = ''
        if ep.get('headers'):
            header_rows = ''.join(
                f"<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in ep['headers']
            )
        headers_section = HEADER_SECTION.format(rows=header_rows) if header_rows else ''
        if ep.get('headers'):
            headers_attr = _attribute_from_json('headers', ep['headers'])

        params_section = ''
        if ep.get('params'):
            param_rows = ''.join(
                f"<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in ep['params']
            )
            params_section = PARAM_SECTION.format(rows=param_rows)

        body_section = ''
        body_attr = ''
        if 'body' in ep:
            if ep['body'] is None:
                body_section = "<section class=\"endpoint__section\"><h4>Request body</h4><p>No body required.</p></section>"
                body_attr = _attribute_from_json('body', None)
            else:
                body_json = json.dumps(ep['body'], indent=2)
                body_section = (
                    "<section class=\"endpoint__section\"><h4>Request body</h4><pre>"
                    f"{html.escape(body_json)}"
                    "</pre></section>"
                )
                body_attr = _attribute_from_json('body', ep['body'])

        success_body = '<p>No body returned.</p>'
        if ep['success'].get('body') is not None:
            success_body = f"<pre>{html.escape(json.dumps(ep['success']['body'], indent=2))}</pre>"

        error_rows = []
        for status, desc, example in ep.get('errors', []):
            example_json = html.escape(json.dumps(example, indent=2)) if example is not None else ''
            error_rows.append(
                f"<tr><td class='status client'>HTTP {status}</td><td>{html.escape(desc)}</td><td><pre>{example_json}</pre></td></tr>"
            )
        error_table = (
            ERROR_TABLE.format(rows=''.join(error_rows)) if error_rows else '<p>No specific error payloads documented.</p>'
        )

        sections.append(
            SECTION.format(
                anchor=anchor,
                name=html.escape(ep['name']),
                method=ep['method'],
                method_class=ep['method'].lower(),
                full_path=html.escape(module['base'] + ep['path']),
                description=html.escape(ep['description']),
                params=params_section,
                headers=headers_section,
                body=body_section,
                success_status=ep['success']['status'],
                success_body=success_body,
                error_table=error_table,
                base_path=html.escape(module['base']),
                path=html.escape(ep['path']),
                auth=html.escape(ep.get('auth', 'Bearer')),
                headers_attr=headers_attr,
                body_attr=body_attr,
            )
        )

    html_output = TEMPLATE.format(
        title=module['title'],
        summary=module['summary'],
        base=module['base'],
        sections=''.join(sections),
        nav_items=''.join(nav_items),
    )
    Path('docs/api').mkdir(parents=True, exist_ok=True)
    Path(f"docs/api/{module['file']}").write_text(html_output)

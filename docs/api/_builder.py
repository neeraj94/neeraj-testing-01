from pathlib import Path
import json
import html

TEMPLATE = """<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>{title}</title>\n  <link rel=\"stylesheet\" href=\"styles.css\" />\n</head>\n<body>\n  <header>\n    <h1>{title}</h1>\n    <p>{summary}</p>\n    <p><strong>Base URL:</strong> <code>{base}</code></p>\n  </header>\n  <main>\n    <section class=\"section-card\">\n      <h2>Endpoint directory</h2>\n      <table>\n        <thead><tr><th>Method</th><th>Path</th><th>Description</th><th>Auth</th></tr></thead>\n        <tbody>\n          {rows}\n        </tbody>\n      </table>\n    </section>\n    {sections}\n  </main>\n  <footer>\n    <p><a href=\"index.html\">Back to index</a></p>\n  </footer>\n</body>\n</html>\n"""

SECTION = """<section class=\"section-card\" id=\"{anchor}\">\n  <h2>{name} <span class=\"badge {method_class}\">{method}</span> <code>{full_path}</code></h2>\n  <p>{description}</p>\n  {headers}\n  {params}\n  {body}\n  <h3>Success response</h3>\n  <p class=\"status success\">HTTP {success_status}</p>\n  {success_body}\n  <h3>Error scenarios</h3>\n  {error_table}\n</section>\n"""

HEADER = """<h3>Headers</h3><table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>{rows}</tbody></table>\n"""
PARAM = """<h3>Parameters</h3><table><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>{rows}</tbody></table>\n"""
ERROR_TABLE = """<table><thead><tr><th>Status</th><th>Description</th><th>Example</th></tr></thead><tbody>{rows}</tbody></table>\n"""

def write_module(module: dict) -> None:
    rows = []
    sections = []
    for ep in module['endpoints']:
        rows.append(
            f"<tr><td><span class='badge {ep['method'].lower()}'>{ep['method']}</span></td><td><code>{html.escape(module['base'] + ep['path'])}</code></td><td>{html.escape(ep['description'])}</td><td>{html.escape(ep.get('auth', 'Bearer'))}</td></tr>"
        )
        headers_html = ''
        if ep.get('headers'):
            header_rows = ''.join(f"<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in ep['headers'])
            headers_html = HEADER.format(rows=header_rows)
        params_html = ''
        if ep.get('params'):
            param_rows = ''.join(f"<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in ep['params'])
            params_html = PARAM.format(rows=param_rows)
        body_html = ''
        if 'body' in ep:
            if ep['body'] is None:
                body_html = '<h3>Request body</h3><p>No body required.</p>'
            else:
                body_html = f"<h3>Request body</h3><pre>{html.escape(json.dumps(ep['body'], indent=2))}</pre>"
        success_body = '<p>No body returned.</p>'
        if ep['success'].get('body') is not None:
            success_body = f"<pre>{html.escape(json.dumps(ep['success']['body'], indent=2))}</pre>"
        error_rows = []
        for status, desc, example in ep.get('errors', []):
            example_json = html.escape(json.dumps(example, indent=2)) if example is not None else ''
            error_rows.append(
                f"<tr><td class='status client'>HTTP {status}</td><td>{html.escape(desc)}</td><td><pre>{example_json}</pre></td></tr>"
            )
        error_table = ERROR_TABLE.format(rows=''.join(error_rows)) if error_rows else '<p>No specific error payloads documented.</p>'
        sections.append(SECTION.format(
            anchor=f"{ep['method'].lower()}-{ep['path'].strip('/').replace('/', '-') or 'root'}",
            name=html.escape(ep['name']),
            method=ep['method'],
            method_class=ep['method'].lower(),
            full_path=html.escape(module['base'] + ep['path']),
            description=html.escape(ep['description']),
            headers=headers_html,
            params=params_html,
            body=body_html,
            success_status=ep['success']['status'],
            success_body=success_body,
            error_table=error_table
        ))
    html_output = TEMPLATE.format(
        title=module['title'],
        summary=module['summary'],
        base=module['base'],
        rows=''.join(rows),
        sections=''.join(sections)
    )
    Path('docs/api').mkdir(parents=True, exist_ok=True)
    Path(f"docs/api/{module['file']}").write_text(html_output)

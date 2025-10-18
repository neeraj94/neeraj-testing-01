(function () {
  const content = document.getElementById('docsContent');
  const baseDisplay = document.querySelector('[data-base-display]');
  const environmentSelect = document.getElementById('environmentSelect');
  const customUrlControl = document.getElementById('customUrlControl');
  const baseUrlInput = document.getElementById('baseUrl');
  const tokenInput = document.getElementById('authToken');
  const navTree = document.querySelector('.sidebar__tree');
  const navLinks = navTree ? Array.from(navTree.querySelectorAll('[data-endpoint-link]')) : [];
  const endpointElements = Array.from(document.querySelectorAll('[data-endpoint-id]'));

  const state = {
    baseUrl: environmentSelect ? environmentSelect.value : '',
    token: '',
  };

  function normaliseBase(value) {
    if (!value) return '';
    return value.replace(/\/$/, '');
  }

  function resolveBaseUrl() {
    return state.baseUrl || '{{BASE_URL}}';
  }

  function updateBaseDisplay() {
    if (baseDisplay) {
      baseDisplay.textContent = resolveBaseUrl();
    }
  }

  function updateCustomVisibility() {
    if (!environmentSelect || !customUrlControl) return;
    const isCustom = environmentSelect.value === 'custom';
    customUrlControl.hidden = !isCustom;
    if (isCustom) {
      baseUrlInput?.focus();
    }
  }

  function sanitisePath(part) {
    if (!part) return '';
    return part.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  function joinUrl(baseUrl, basePath, path) {
    const prefix = normaliseBase(baseUrl) || '{{BASE_URL}}';
    const segments = [sanitisePath(basePath), sanitisePath(path)].filter(Boolean);
    if (!segments.length) {
      return prefix;
    }
    return `${prefix}/${segments.join('/')}`;
  }

  function parseJsonAttribute(value) {
    if (!value || value === 'null') return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Unable to parse attribute JSON', value, error);
      return null;
    }
  }

  function ensureHeaders(rawHeaders, requiresAuth, methodHasBody, providedBody) {
    const headers = [];
    const seen = new Map();

    (rawHeaders || []).forEach(([key, value]) => {
      const upperKey = String(key).toLowerCase();
      if (!seen.has(upperKey)) {
        seen.set(upperKey, { key, value });
        headers.push({ key, value });
      }
    });

    if (!seen.has('accept')) {
      headers.push({ key: 'Accept', value: 'application/json' });
      seen.set('accept', true);
    }

    if (requiresAuth && !seen.has('authorization')) {
      headers.push({ key: 'Authorization', value: 'Bearer {{TOKEN}}' });
    }

    if (methodHasBody && providedBody != null && String(providedBody).trim().length > 0 && !seen.has('content-type')) {
      headers.push({ key: 'Content-Type', value: 'application/json' });
    }

    return headers;
  }

  function stringifyBody(body) {
    if (body == null) return null;
    if (typeof body === 'string') return body;
    return JSON.stringify(body, null, 2);
  }

  function methodSupportsBody(method) {
    const upper = method.toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper);
  }

  function buildCurlBash({ method, url, headers, body }) {
    const lines = [`curl -X ${method.toUpperCase()} '${url}'`];
    headers.forEach(({ key, value }) => {
      const rendered = key.toLowerCase() === 'authorization' ? value.replace('{{TOKEN}}', state.token || '{{TOKEN}}') : value;
      lines.push(`  -H '${key}: ${rendered}'`);
    });
    if (body) {
      lines.push(`  -d '${body}'`);
    }
    return lines.join(' \\n');
  }

  function escapeForDoubleQuotes(value) {
    return value.replace(/"/g, '\\"');
  }

  function buildCurlPowerShell({ method, url, headers, body }) {
    const segments = [`curl.exe -X ${method.toUpperCase()} "${url}"`];
    headers.forEach(({ key, value }) => {
      const rendered = key.toLowerCase() === 'authorization' ? value.replace('{{TOKEN}}', state.token || '{{TOKEN}}') : value;
      segments.push(`  -H "${escapeForDoubleQuotes(`${key}: ${rendered}`)}"`);
    });
    if (body) {
      segments.push(`  -d "${escapeForDoubleQuotes(body)}"`);
    }
    return segments.join(" `\n");
  }

  function headersToText(headers) {
    return headers
      .map(({ key, value }) => {
        const rendered = key.toLowerCase() === 'authorization' ? value.replace('{{TOKEN}}', state.token || '{{TOKEN}}') : value;
        return `${key}: ${rendered}`;
      })
      .join('\n');
  }

  function updateTryForm(endpointEl, payload) {
    const form = endpointEl.querySelector('[data-try-form]');
    if (!form) return;
    const urlInput = form.querySelector('[data-try-url]');
    const headersField = form.querySelector('[data-try-headers]');
    const bodyWrapper = form.querySelector('[data-try-body-wrapper]');
    const bodyField = form.querySelector('[data-try-body]');
    const submitButton = form.querySelector('[data-try-submit]');

    if (urlInput) {
      urlInput.value = payload.url;
    }
    if (headersField) {
      headersField.value = headersToText(payload.headers);
    }
    if (bodyWrapper) {
      bodyWrapper.hidden = !methodSupportsBody(payload.method);
    }
    if (bodyField) {
      bodyField.value = payload.body ?? '';
    }
    if (submitButton) {
      submitButton.textContent = `Send ${payload.method.toUpperCase()}`;
    }
  }

  function parseHeaderText(value) {
    const headers = new Headers();
    (value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.slice(0, idx).trim();
          const headerValue = line.slice(idx + 1).trim();
          if (key) {
            headers.set(key, headerValue);
          }
        }
      });
    return headers;
  }

  async function handleTrySubmit(endpointEl, form) {
    const method = (endpointEl.dataset.method || 'GET').toUpperCase();
    const urlInput = form.querySelector('[data-try-url]');
    const headersField = form.querySelector('[data-try-headers]');
    const bodyField = form.querySelector('[data-try-body]');
    const responseContainer = endpointEl.querySelector('[data-try-response]');
    const statusEl = endpointEl.querySelector('[data-try-status]');
    const durationEl = endpointEl.querySelector('[data-try-duration]');
    const outputEl = endpointEl.querySelector('[data-try-output]');

    if (!urlInput || !responseContainer || !statusEl || !outputEl) {
      return;
    }

    const url = urlInput.value.trim();
    if (!url) {
      statusEl.textContent = 'Missing URL';
      responseContainer.hidden = false;
      return;
    }

    const headers = parseHeaderText(headersField?.value);
    const authEntry = Array.from(headers.entries()).find(([key]) => key.toLowerCase() === 'authorization');
    if (authEntry) {
      const [authKey, authValue] = authEntry;
      if (state.token) {
        headers.set(authKey, authValue.replace('{{TOKEN}}', state.token));
      } else if (authValue.includes('{{TOKEN}}')) {
        headers.delete(authKey);
      }
    } else if (state.token) {
      headers.set('Authorization', `Bearer ${state.token}`);
    }

    responseContainer.hidden = false;
    statusEl.textContent = 'Sending…';
    if (durationEl) durationEl.textContent = '';
    outputEl.textContent = '';

    const requestInit = { method, headers };
    const bodyText = bodyField?.value || '';
    if (methodSupportsBody(method) && bodyText.trim()) {
      const headerEntries = Array.from(headers.entries());
      const contentTypeEntry = headerEntries.find(([key]) => key.toLowerCase() === 'content-type');
      const contentType = contentTypeEntry ? contentTypeEntry[1] : '';
      if (contentType.includes('multipart/form-data')) {
        const formData = new FormData();
        bodyText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            const idx = line.indexOf('=');
            if (idx > -1) {
              const key = line.slice(0, idx).trim();
              const value = line.slice(idx + 1).trim();
              if (key) {
                formData.append(key, value);
              }
            }
          });
        requestInit.body = formData;
        headers.delete('content-type');
      } else {
        requestInit.body = bodyText;
      }
    }

    const started = performance.now();
    try {
      const response = await fetch(url, requestInit);
      const elapsed = Math.round(performance.now() - started);
      statusEl.textContent = `HTTP ${response.status}`;
      if (durationEl) {
        durationEl.textContent = `${elapsed} ms`;
      }
      let text = await response.text();
      const responseType = response.headers.get('Content-Type') || '';
      if (responseType.includes('application/json')) {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch (error) {
          // ignore malformed json
        }
      }
      outputEl.textContent = text || '[empty response]';
    } catch (error) {
      statusEl.textContent = 'Request failed';
      if (durationEl) durationEl.textContent = '';
      outputEl.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function updateEndpointSamples(endpointEl) {
    const method = endpointEl.dataset.method || 'GET';
    const basePath = endpointEl.dataset.basePath || '';
    const path = endpointEl.dataset.path || '';
    const auth = (endpointEl.dataset.auth || '').toLowerCase();
    const headers = parseJsonAttribute(endpointEl.dataset.headers);
    const body = parseJsonAttribute(endpointEl.dataset.body);

    const preparedBody = stringifyBody(body);
    const preparedHeaders = ensureHeaders(headers, auth !== 'public', methodSupportsBody(method), preparedBody);
    const url = joinUrl(resolveBaseUrl(), basePath, path);

    const payload = { method, url, headers: preparedHeaders, body: preparedBody };

    const bashBlock = endpointEl.querySelector('[data-template="curl-bash"]');
    const psBlock = endpointEl.querySelector('[data-template="curl-powershell"]');
    if (bashBlock) {
      bashBlock.textContent = buildCurlBash(payload);
    }
    if (psBlock) {
      psBlock.textContent = buildCurlPowerShell(payload);
    }

    updateTryForm(endpointEl, payload);
  }

  function updateAllSamples() {
    endpointElements.forEach(updateEndpointSamples);
  }

  function handleEnvironmentChange() {
    if (!environmentSelect) return;
    if (environmentSelect.value === 'custom') {
      state.baseUrl = normaliseBase(baseUrlInput?.value || '');
    } else {
      state.baseUrl = normaliseBase(environmentSelect.value);
    }
    updateBaseDisplay();
    updateAllSamples();
  }

  environmentSelect?.addEventListener('change', () => {
    updateCustomVisibility();
    handleEnvironmentChange();
  });

  baseUrlInput?.addEventListener('input', () => {
    if (environmentSelect && environmentSelect.value === 'custom') {
      state.baseUrl = normaliseBase(baseUrlInput.value);
      updateBaseDisplay();
      updateAllSamples();
    }
  });

  tokenInput?.addEventListener('input', () => {
    state.token = tokenInput.value.trim();
    updateAllSamples();
  });

  function activateTab(button, container) {
    const targetId = button.getAttribute('data-tab-target');
    if (!targetId) return;
    container.querySelectorAll('.code-samples__tab').forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    container.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.toggleAttribute('hidden', !isActive);
      panel.classList.toggle('is-hidden', !isActive);
    });
  }

  document.querySelectorAll('.code-samples').forEach((container) => {
    container.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement && target.matches('.code-samples__tab')) {
        activateTab(target, container);
      }
      if (target instanceof HTMLButtonElement && target.hasAttribute('data-copy')) {
        const activePanel = container.querySelector('[role="tabpanel"]:not([hidden])');
        if (activePanel) {
          navigator.clipboard?.writeText(activePanel.textContent || '');
          target.textContent = 'Copied!';
          setTimeout(() => {
            target.textContent = 'Copy';
          }, 2000);
        }
      }
    });
  });

  function scrollToEndpoint(id) {
    const el = document.getElementById(id);
    if (!el || !content) return;
    const top = el.offsetTop - content.offsetTop;
    content.scrollTo({ top, behavior: 'smooth' });
  }

  navLinks.forEach((link) => {
    link.setAttribute('role', 'treeitem');
    link.setAttribute('tabindex', '-1');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = link.getAttribute('data-endpoint-link');
      if (targetId) {
        scrollToEndpoint(targetId);
        history.replaceState(null, '', `#${targetId}`);
      }
      link.focus();
    });
  });

  endpointElements.forEach((endpointEl) => {
    const form = endpointEl.querySelector('[data-try-form]');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleTrySubmit(endpointEl, form);
    });
  });

  if (navTree) {
    navTree.setAttribute('role', 'tree');
    navTree.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = navLinks.indexOf(document.activeElement);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = Math.min(navLinks.length - 1, currentIndex + 1);
      } else if (event.key === 'ArrowUp') {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = navLinks.length - 1;
      }
      const nextLink = navLinks[nextIndex];
      nextLink?.focus();
    });
  }

  function setActiveNav(id) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('data-endpoint-link') === id;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('tabindex', '0');
      } else {
        link.setAttribute('tabindex', '-1');
      }
    });
  }

  if (content && endpointElements.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveNav(visible[0].target.id);
        }
      },
      { root: content, threshold: [0.4, 0.6] }
    );
    endpointElements.forEach((section) => observer.observe(section));
  }

  const initialHash = window.location.hash.slice(1);
  if (initialHash) {
    setTimeout(() => {
      scrollToEndpoint(initialHash);
      setActiveNav(initialHash);
    }, 100);
  } else if (navLinks.length) {
    navLinks[0].setAttribute('tabindex', '0');
  }

  updateCustomVisibility();
  updateBaseDisplay();
  updateAllSamples();
})();

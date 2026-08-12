import { readFileSync, writeFileSync } from 'node:fs';

const HTML_PATH = 'index.html';
const THEME_STYLES_MARKER = 'id="anchor-theme-styles"';

const THEME_PRELOAD = `<script id="anchor-theme-preload">
    (() => {
      const storageKey = 'anchor-theme';
      let theme;

      try {
        theme = window.localStorage.getItem(storageKey);
      } catch {
        // Local storage may be disabled; fall back to the system preference.
      }

      if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      document.documentElement.dataset.anchorTheme = theme;
    })();
  </script>`;

const THEME_STYLES = `<style id="anchor-theme-styles">
    :root[data-anchor-theme='light'] {
      color-scheme: light;
    }

    :root[data-anchor-theme='dark'] {
      color-scheme: dark;
    }

    #anchor-theme-toggle {
      position: fixed;
      top: 14px;
      right: 18px;
      z-index: 1000;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 11px;
      border: 1px solid #c8d0d5;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.94);
      color: #263238;
      box-shadow: 0 2px 8px rgba(38, 50, 56, 0.14);
      cursor: pointer;
      font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    #anchor-theme-toggle:hover,
    #anchor-theme-toggle:focus-visible {
      border-color: #6366f1;
      outline: 2px solid rgba(99, 102, 241, 0.35);
      outline-offset: 2px;
    }

    #anchor-theme-toggle [data-theme-icon] {
      font-size: 14px;
      line-height: 1;
    }

    :root[data-anchor-theme='dark'] body,
    :root[data-anchor-theme='dark'] #redoc,
    :root[data-anchor-theme='dark'] #redoc .redoc-wrap {
      background: #0d1117 !important;
      color: #e6edf3 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .menu-content,
    :root[data-anchor-theme='dark'] #redoc [role='search'] {
      background: #111923 !important;
      color: #e6edf3 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .menu-content label,
    :root[data-anchor-theme='dark'] #redoc .menu-content > div:nth-child(2) > div:nth-child(2) {
      background: #111923 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .menu-content > div:nth-child(2) > div:nth-child(2) a {
      color: #8b949e !important;
    }

    :root[data-anchor-theme='dark'] #redoc .menu-content label:hover,
    :root[data-anchor-theme='dark'] #redoc .menu-content label:focus-within {
      background: #1f2a36 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .search-input {
      border-bottom-color: #34404c !important;
      color: #e6edf3 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .search-input::placeholder {
      color: #8b949e !important;
    }

    :root[data-anchor-theme='dark'] #redoc [role='menuitem'] {
      color: #c9d1d9 !important;
    }

    :root[data-anchor-theme='dark'] #redoc [role='menuitem']:hover,
    :root[data-anchor-theme='dark'] #redoc [role='menuitem'][aria-expanded='true'] {
      background: #1f2a36 !important;
      color: #ffffff !important;
    }

    :root[data-anchor-theme='dark'] #redoc h1,
    :root[data-anchor-theme='dark'] #redoc h2,
    :root[data-anchor-theme='dark'] #redoc h3,
    :root[data-anchor-theme='dark'] #redoc h4,
    :root[data-anchor-theme='dark'] #redoc h5,
    :root[data-anchor-theme='dark'] #redoc h6 {
      color: #f0f6fc !important;
    }

    :root[data-anchor-theme='dark'] #redoc p,
    :root[data-anchor-theme='dark'] #redoc li,
    :root[data-anchor-theme='dark'] #redoc td,
    :root[data-anchor-theme='dark'] #redoc th,
    :root[data-anchor-theme='dark'] #redoc label,
    :root[data-anchor-theme='dark'] #redoc .property-name {
      color: #c9d1d9 !important;
    }

    :root[data-anchor-theme='dark'] #redoc a,
    :root[data-anchor-theme='dark'] #redoc a:visited {
      color: #8ab4ff !important;
    }

    :root[data-anchor-theme='dark'] #redoc a:hover {
      color: #b6cfff !important;
    }

    :root[data-anchor-theme='dark'] #redoc table tr {
      background: #161b22 !important;
      border-top-color: #30363d !important;
    }

    :root[data-anchor-theme='dark'] #redoc table tr:nth-child(2n) {
      background: #0d1117 !important;
    }

    :root[data-anchor-theme='dark'] #redoc table th,
    :root[data-anchor-theme='dark'] #redoc table td {
      border-color: #30363d !important;
    }

    :root[data-anchor-theme='dark'] #redoc p code,
    :root[data-anchor-theme='dark'] #redoc li code,
    :root[data-anchor-theme='dark'] #redoc td code,
    :root[data-anchor-theme='dark'] #redoc th code {
      background: #21262d !important;
      border-color: #30363d !important;
      color: #ffb86c !important;
    }

    :root[data-anchor-theme='dark'] #redoc .redoc-json,
    :root[data-anchor-theme='dark'] #redoc pre {
      background: #161b22 !important;
    }

    :root[data-anchor-theme='dark'] #redoc .redoc-json code,
    :root[data-anchor-theme='dark'] #redoc pre code {
      color: #e6edf3 !important;
    }

    :root[data-anchor-theme='dark'] #redoc button:not(#anchor-theme-toggle) {
      color: #e6edf3;
    }

    /* Redoc's mobile scroll control is a fixed sibling of .api-content. */
    :root[data-anchor-theme='dark'] #redoc .redoc-wrap > div:nth-child(2) {
      background: #161b22 !important;
      color: #8ab4ff !important;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.6) !important;
    }

    :root[data-anchor-theme='dark'] #anchor-theme-toggle {
      border-color: #465463;
      background: rgba(22, 27, 34, 0.96);
      color: #e6edf3;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }

    @media screen and (max-width: 75rem) {
      #anchor-theme-toggle {
        top: 10px;
        right: 12px;
      }
    }

    @media print {
      #anchor-theme-toggle {
        display: none !important;
      }
    }
  </style>`;

const THEME_TOGGLE = `<button id="anchor-theme-toggle" type="button" aria-pressed="false">
    <span data-theme-icon aria-hidden="true">☾</span>
    <span data-theme-label>Dark mode</span>
  </button>`;

const THEME_SCRIPT = `<script id="anchor-theme-script">
    (() => {
      const storageKey = 'anchor-theme';
      const root = document.documentElement;
      const button = document.getElementById('anchor-theme-toggle');
      const label = button?.querySelector('[data-theme-label]');
      const icon = button?.querySelector('[data-theme-icon]');
      const media = window.matchMedia('(prefers-color-scheme: dark)');

      if (!button || !label || !icon) return;

      const storedTheme = () => {
        try {
          const value = window.localStorage.getItem(storageKey);
          return value === 'light' || value === 'dark' ? value : null;
        } catch {
          return null;
        }
      };

      const render = (theme) => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        root.dataset.anchorTheme = theme;
        button.setAttribute('aria-pressed', String(theme === 'dark'));
        button.setAttribute('aria-label', \`Switch to \${nextTheme} mode\`);
        label.textContent = \`\${nextTheme[0].toUpperCase()}\${nextTheme.slice(1)} mode\`;
        icon.textContent = theme === 'dark' ? '☀' : '☾';
      };

      const setTheme = (theme, persist) => {
        render(theme);
        if (persist) {
          try {
            window.localStorage.setItem(storageKey, theme);
          } catch {
            // The theme still applies for this page even if persistence is unavailable.
          }
        }
      };

      render(root.dataset.anchorTheme || (media.matches ? 'dark' : 'light'));
      button.addEventListener('click', () => {
        setTheme(root.dataset.anchorTheme === 'dark' ? 'light' : 'dark', true);
      });

      const followSystemPreference = () => {
        if (!storedTheme()) setTheme(media.matches ? 'dark' : 'light', false);
      };

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', followSystemPreference);
      } else {
        media.addListener(followSystemPreference);
      }
    })();
  </script>`;

const html = readFileSync(HTML_PATH, 'utf-8');

if (html.includes(THEME_STYLES_MARKER)) {
  process.exit(0); // already injected
}

const headMarker = '</head>';
const headIdx = html.indexOf(headMarker);
if (headIdx === -1) {
  throw new Error(`Could not find "${headMarker}" in ${HTML_PATH} to inject the theme`);
}

let updated = html.slice(0, headIdx) + `${THEME_PRELOAD}\n${THEME_STYLES}\n` + html.slice(headIdx);

const bodyMarker = '<body>';
const bodyIdx = updated.indexOf(bodyMarker);
if (bodyIdx === -1) {
  throw new Error(`Could not find "${bodyMarker}" in ${HTML_PATH} to inject the theme toggle`);
}

const bodyInsertAt = bodyIdx + bodyMarker.length;
updated = updated.slice(0, bodyInsertAt) + `\n  ${THEME_TOGGLE}` + updated.slice(bodyInsertAt);

const bodyEndMarker = '</body>';
const bodyEndIdx = updated.lastIndexOf(bodyEndMarker);
if (bodyEndIdx === -1) {
  throw new Error(`Could not find "${bodyEndMarker}" in ${HTML_PATH} to attach the theme behavior`);
}

updated = updated.slice(0, bodyEndIdx) + `${THEME_SCRIPT}\n` + updated.slice(bodyEndIdx);
writeFileSync(HTML_PATH, updated);

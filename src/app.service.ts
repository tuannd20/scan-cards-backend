import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

type RenderedApiDocs = {
  html: string;
  statusCode: number;
};

type NavItem = {
  id: string;
  text: string;
  level: number;
};

@Injectable()
export class AppService {
  private cachedApiDocsHtml?: string;

  getHello(): string {
    return 'Hello World!';
  }

  getApiDocsHtml(): RenderedApiDocs {
    if (this.cachedApiDocsHtml) {
      return {
        html: this.cachedApiDocsHtml,
        statusCode: 200,
      };
    }

    try {
      const markdownPath = join(process.cwd(), 'docs', 'postman-curl-mapping.md');
      const markdown = readFileSync(markdownPath, 'utf8');
      this.cachedApiDocsHtml = this.renderApiDocsPage(markdown);

      return {
        html: this.cachedApiDocsHtml,
        statusCode: 200,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown documentation error';

      return {
        html: this.renderErrorPage(message),
        statusCode: 500,
      };
    }
  }

  private renderApiDocsPage(markdown: string): string {
    const { body, navItems } = this.renderMarkdown(markdown);
    const sidebarLinks = navItems
      .map(
        (item) => `
          <a class="nav-link nav-level-${item.level}" href="#${item.id}">
            ${this.escapeHtml(item.text)}
          </a>`,
      )
      .join('');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scan Cards API Docs</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #ffffff;
      --text: #172033;
      --muted: #667085;
      --line: #d9dee8;
      --accent: #0f766e;
      --accent-strong: #115e59;
      --code-bg: #111827;
      --code-text: #e5e7eb;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
    }

    .layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }

    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      border-right: 1px solid var(--line);
      background: var(--panel);
      padding: 24px 18px;
    }

    .brand {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .brand-title {
      margin: 0;
      font-size: 18px;
      font-weight: 750;
    }

    .brand-subtitle {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    .nav-link {
      display: block;
      color: var(--text);
      text-decoration: none;
      border-radius: 6px;
      padding: 7px 9px;
      font-size: 14px;
    }

    .nav-link:hover {
      background: #eef6f5;
      color: var(--accent-strong);
    }

    .nav-level-3 {
      padding-left: 20px;
      color: var(--muted);
      font-size: 13px;
    }

    main {
      width: min(100%, 1120px);
      padding: 42px 34px 80px;
    }

    .doc-content {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
    }

    h1, h2, h3 {
      line-height: 1.2;
      letter-spacing: 0;
    }

    h1 {
      margin: 0 0 14px;
      font-size: 32px;
    }

    h2 {
      margin: 42px 0 14px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
      font-size: 24px;
    }

    h3 {
      margin: 30px 0 12px;
      font-size: 18px;
    }

    p {
      margin: 10px 0;
      color: #344054;
    }

    ul {
      margin: 10px 0 18px;
      padding-left: 24px;
      color: #344054;
    }

    code {
      border-radius: 5px;
      background: #eef2f7;
      padding: 2px 5px;
      font-size: 0.92em;
    }

    .code-block {
      position: relative;
      margin: 14px 0 24px;
      border-radius: 8px;
      overflow: hidden;
      background: var(--code-bg);
    }

    .copy-button {
      position: absolute;
      top: 10px;
      right: 10px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      padding: 6px 10px;
    }

    .copy-button:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    pre {
      margin: 0;
      overflow-x: auto;
      padding: 44px 18px 18px;
      color: var(--code-text);
      font-size: 13px;
      line-height: 1.5;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }

    a {
      color: var(--accent-strong);
    }

    @media (max-width: 860px) {
      .layout {
        display: block;
      }

      aside {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      main {
        padding: 22px 14px 48px;
      }

      .doc-content {
        padding: 22px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">
        <p class="brand-title">Scan Cards API</p>
        <p class="brand-subtitle">cURL docs for Postman import</p>
      </div>
      <nav aria-label="API sections">
        ${sidebarLinks}
      </nav>
    </aside>
    <main>
      <article class="doc-content">
        ${body}
      </article>
    </main>
  </div>
  <script>
    document.querySelectorAll('.copy-button').forEach((button) => {
      button.addEventListener('click', async () => {
        const block = button.nextElementSibling;
        const text = block ? block.innerText : '';
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = 'Copied';
          window.setTimeout(() => {
            button.textContent = 'Copy';
          }, 1400);
        } catch (error) {
          button.textContent = 'Select';
        }
      });
    });
  </script>
</body>
</html>`;
  }

  private renderMarkdown(markdown: string): { body: string; navItems: NavItem[] } {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    const navItems: NavItem[] = [];
    const usedIds = new Map<string, number>();
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let inList = false;
    let paragraphBuffer: string[] = [];

    const closeParagraph = () => {
      if (!paragraphBuffer.length) return;
      html.push(`<p>${this.renderInline(paragraphBuffer.join(' '))}</p>`);
      paragraphBuffer = [];
    };

    const closeList = () => {
      if (!inList) return;
      html.push('</ul>');
      inList = false;
    };

    const closeTextBlocks = () => {
      closeParagraph();
      closeList();
    };

    for (const line of lines) {
      const fenceMatch = line.match(/^```/);
      if (fenceMatch) {
        if (inCodeBlock) {
          html.push(this.renderCodeBlock(codeBuffer.join('\n')));
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          closeTextBlocks();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (!line.trim()) {
        closeTextBlocks();
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeTextBlocks();
        const level = heading[1].length;
        const text = heading[2].trim();
        const id = this.createHeadingId(text, usedIds);

        if (level >= 2) {
          navItems.push({ id, text: this.stripInlineMarkdown(text), level });
        }

        html.push(
          `<h${level} id="${id}">${this.renderInline(text)}</h${level}>`,
        );
        continue;
      }

      const listItem = line.match(/^-\s+(.+)$/);
      if (listItem) {
        closeParagraph();
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${this.renderInline(listItem[1])}</li>`);
        continue;
      }

      closeList();
      paragraphBuffer.push(line.trim());
    }

    if (inCodeBlock) {
      html.push(this.renderCodeBlock(codeBuffer.join('\n')));
    }

    closeTextBlocks();

    return {
      body: html.join('\n'),
      navItems,
    };
  }

  private renderCodeBlock(code: string): string {
    return `<div class="code-block">
  <button class="copy-button" type="button" aria-label="Copy cURL command">Copy</button>
  <pre><code>${this.escapeHtml(code)}</code></pre>
</div>`;
  }

  private renderInline(value: string): string {
    let html = this.escapeHtml(value);

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );

    return html;
  }

  private stripInlineMarkdown(value: string): string {
    return value
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  private createHeadingId(text: string, usedIds: Map<string, number>): string {
    const base =
      this.stripInlineMarkdown(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'section';
    const count = usedIds.get(base) || 0;
    usedIds.set(base, count + 1);

    return count === 0 ? base : `${base}-${count + 1}`;
  }

  private renderErrorPage(message: string): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs unavailable</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f6f7fb;
      color: #172033;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    main {
      width: min(92vw, 640px);
      border: 1px solid #d9dee8;
      border-radius: 8px;
      background: #ffffff;
      padding: 28px;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
    }

    h1 {
      margin: 0 0 12px;
      font-size: 24px;
    }

    p {
      margin: 0;
      color: #667085;
    }
  </style>
</head>
<body>
  <main>
    <h1>API docs unavailable</h1>
    <p>${this.escapeHtml(message)}</p>
  </main>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

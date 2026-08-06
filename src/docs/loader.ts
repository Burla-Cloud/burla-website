// Loads the raw markdown for a docs route and converts GitBook-flavored
// syntax (frontmatter, hints, embeds, card tables) into plain markdown plus
// a little HTML that the renderer in markdown.tsx styles.

const BASE = import.meta.env.BASE_URL; // "/" in dev, "/burla-website/" on Pages

// Raw markdown for every docs page. The docs bundle is lazy loaded, so
// eager-importing all ~40 pages (a few hundred KB) keeps page changes
// instant without bloating the landing chunk.
const rawFiles = import.meta.glob("./content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type DocContent = {
  markdown: string;
  description?: string;
};

/** "/docs/blog/dynamic-hardware" -> "./content/blog/dynamic-hardware.md" */
function fileForRoute(route: string): string {
  return `./content${route.slice("/docs".length)}.md`;
}

function parseFrontmatter(raw: string): { body: string; description?: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { body: raw };
  const fm = match[1];
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return { body: raw.slice(match[0].length), description };
}

/** {% hint style="info" %} ... {% endhint %} -> marked blockquote. */
function transformHints(md: string): string {
  return md.replace(
    /\{%\s*hint\s+style="(\w+)"\s*%\}\n?([\s\S]*?)\{%\s*endhint\s*%\}/g,
    (_m, style: string, inner: string) => {
      const quoted = inner
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      // The blank quoted line keeps the marker in its own paragraph.
      return `> [!HINT:${style}]\n>\n${quoted}`;
    },
  );
}

/** {% embed url="..." %} -> YouTube iframe, or a plain link for other hosts. */
function transformEmbeds(md: string): string {
  return md.replace(/\{%\s*embed\s+url="([^"]+)"\s*%\}/g, (_m, url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) {
      return `<div class="doc-embed"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    let label = url;
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep full url */
    }
    return `<p><a class="doc-embed-link" href="${url}">${label} ↗</a></p>`;
  });
}

/** GitBook card tables -> a grid of image cards. */
function transformCardTables(md: string): string {
  return md.replace(/<table data-view="cards">[\s\S]*?<\/table>/g, (table) => {
    const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
    const rows = body.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
    const cards = rows
      .map((row) => {
        const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
        if (cells.length < 3) return "";
        const [title, desc, targetCell, coverCell = ""] = cells;
        const target = targetCell.match(/href="([^"]+)"/)?.[1] ?? "#";
        const cover = coverCell.match(/href="([^"]+)"/)?.[1];
        const img = cover
          ? `<span class="doc-card-cover"><img src="${cover}" alt="" loading="lazy"></span>`
          : "";
        return (
          `<a class="doc-card" href="${target}">${img}` +
          `<span class="doc-card-body"><span class="doc-card-title">${title}</span>` +
          `<span class="doc-card-desc">${desc}</span></span></a>`
        );
      })
      .join("");
    return `<div class="doc-cards">${cards}</div>`;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function preprocess(raw: string): DocContent {
  const { body, description } = parseFrontmatter(raw);
  let md = body;
  md = md.replace(/^&#x20;\s*$/gm, ""); // GitBook spacer lines -> nothing
  md = transformHints(md);
  md = transformEmbeds(md);
  md = transformCardTables(md);
  // GitBook renders the frontmatter description as a subtitle under the h1.
  if (description) {
    md = md.replace(
      /^# .+$/m,
      (h1) => `${h1}\n\n<p class="doc-desc">${escapeHtml(description)}</p>`,
    );
  }
  // public/ asset URLs need the deploy base prefix (e.g. /burla-website/).
  if (BASE !== "/") {
    md = md.replaceAll('="/docs-assets/', `="${BASE}docs-assets/`);
    md = md.replaceAll("](/docs-assets/", `](${BASE}docs-assets/`);
  }
  return {
    markdown: md,
    description,
  };
}

const cache = new Map<string, DocContent>();

export function getDocContent(route: string): DocContent | undefined {
  if (cache.has(route)) return cache.get(route);
  const raw = rawFiles[fileForRoute(route)];
  if (raw === undefined) return undefined;
  const content = preprocess(raw);
  cache.set(route, content);
  return content;
}

export type DocHeading = { id: string; text: string; level: number };

/** GitHub-slugger equivalent for the ids rehype-slug generates. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** h2-h4 headings straight from the markdown source. */
export function docHeadings(markdown: string): DocHeading[] {
  // Fenced code blocks can contain `#`-prefixed lines (bash comments).
  const withoutCode = markdown.replace(/```[^\n]*\n[\s\S]*?```/g, "");
  return [...withoutCode.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((m) => {
    // Strip markdown emphasis/code markers but keep underscores: headings
    // like `remote_parallel_map` need them in both label and slug.
    const text = m[2].replace(/[*`]/g, "").replace(/\\$/, "").trim();
    return { id: slugify(text), text, level: m[1].length };
  });
}

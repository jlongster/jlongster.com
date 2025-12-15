import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);

export async function loader({ params }: { params: { name: string } }) {
  const { name } = params;

  if (!name) {
    return new Response('Missing example name', { status: 400 });
  }

  // Validate the name to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return new Response('Invalid example name', { status: 400 });
  }

  const sourceUrl = `https://static.jlongster.com/${name}/index.jsx`;

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return new Response(`Failed to fetch source: ${response.status}`, {
        status: response.status,
      });
    }

    const sourceCode = await response.text();

    // Apply syntax highlighting
    const highlighted = hljs.highlight(sourceCode, {
      language: 'javascript',
    }).value;

    const html = `<pre><code class="hljs">${highlighted}</code></pre>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(`Error fetching source: ${err}`, { status: 500 });
  }
}

import { micromark } from 'micromark';
import { math, mathHtml } from 'micromark-extension-math';
import {
  gfmAutolinkLiteral,
  gfmAutolinkLiteralHtml,
} from 'micromark-extension-gfm-autolink-literal';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
// import html from 'highlight.js/lib/languages/html';

hljs.registerLanguage('javascript', javascript);
// hljs.registerLanguage('html', html);

const languages = new Set(['js', 'javascript']);

function cleanBackticks(str) {
  return str.replace(/\\`\\`\\`/g, '```');
}

export function renderString(str, options = {}) {
  return micromark(str, {
    allowDangerousHtml: true,
    extensions: [options.nomath ? null : math(), gfmAutolinkLiteral()].filter(
      Boolean,
    ),
    htmlExtensions: [
      options.nomath ? null : mathHtml(),
      gfmAutolinkLiteralHtml(),
    ].filter(Boolean),
  });
}

export function renderBlock(block, options = {}) {
  if (block.type === 'code' && languages.has(block.meta.lang)) {
    return (
      '<pre><code>' +
      hljs.highlight(cleanBackticks(block.string), {
        language: block.meta.lang,
      }).value +
      '</code></pre>'
    );
  }

  let output = micromark(block.md, {
    allowDangerousHtml: true,
    extensions: [options.nomath ? null : math(), gfmAutolinkLiteral()].filter(
      Boolean,
    ),
    htmlExtensions: [
      options.nomath ? null : mathHtml(),
      gfmAutolinkLiteralHtml(),
    ].filter(Boolean),
  });

  if (block.type === 'code') {
    output = cleanBackticks(output);
  }

  return output;
}

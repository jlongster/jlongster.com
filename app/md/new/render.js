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

export function renderString(str) {
  return micromark(str, {
    allowDangerousHtml: true,
    extensions: [math(), gfmAutolinkLiteral()],
    htmlExtensions: [mathHtml(), gfmAutolinkLiteralHtml()],
  });
}

export function renderBlock(block) {
  if (block.type === 'code' && languages.has(block.meta.lang)) {
    return (
      '<code>' +
      hljs.highlight(block.string, { language: block.meta.lang }).value +
      '</code>'
    );
  }

  const output = micromark(block.md, {
    allowDangerousHtml: true,
    extensions: [math(), gfmAutolinkLiteral()],
    htmlExtensions: [mathHtml(), gfmAutolinkLiteralHtml()],
  });

  // We don't want the <p> wrapper
  return output;
}

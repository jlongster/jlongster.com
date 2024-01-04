import MarkdownIt from 'markdown-it';
import mdHighlightJS from 'markdown-it-highlightjs';
import { walkBlocks } from '../shared/data';

let md = MarkdownIt({ linkify: true, typographer: true });
md.use(mdHighlightJS);

export function renderMd(content) {
  return md.render(content);
}

export function renderInlineMd(content) {
  return md.renderInline(content);
}

const renderableTypes = new Set([
  'css',
  'js-element',
  'js-no-module',
  'js',
  'javascript',
  'html',
]);

export function renderBlock(block) {
  walkBlocks(block, b => {
    let content = b.content.replace(/^[\w-]+:: .*/gm, '').trim();
    b.raw = content;

    if (renderableTypes.has(b.properties.render)) {
      b.string = content.replace(/^```\w*/, '').replace(/```$/, '');
    } else {
      // We don't want the <p> wrapper, but we can't use `renderInlineMd`
      // because it doesn't properly render code blocks
      let rendered = renderMd(content);
      b.string = rendered.replace(/^\s*<p>/, '').replace(/<\/p>\s*$/, '');
    }
  });
}

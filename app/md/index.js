import MarkdownIt from 'markdown-it';
import mdHighlightJS from 'markdown-it-highlightjs';
import * as text from './text';
import * as emphasis from './emphasis';
import * as ref from './ref';
import balanceRefs from './balance-refs';
import { walkBlocks } from '../shared/data';

let md = MarkdownIt({
  linkify: true,
  typographer: true
});

// md.inline.ruler.at('text', text.tokenize);
// md.inline.ruler.at('emphasis', emphasis.tokenize);
// md.inline.ruler2.at('emphasis', emphasis.postProcess);
// md.inline.ruler.after('link', 'ref', ref.tokenize);
// md.inline.ruler2.before('emphasis', 'ref', ref.postProcess);
// md.inline.ruler2.after('balance_pairs', 'balance_refs', balanceRefs);

md.use(mdHighlightJS, { inline: true });

export function renderMd(content) {
  return md.render(content);
}

export function renderInlineMd(content) {
  return md.renderInline(content);
}

export function renderBlock(block) {
  walkBlocks(block, b => {
    let content = b.content.replace(/^id:: .*/m, '').trim();

    b.raw = content;

    // We don't want the <p> wrapper, but we can't use `renderInlineMd`
    // because it doesn't properly render code blocks
    let rendered = renderMd(content);
    b.string = rendered.replace(/^\s*<p>/, '').replace(/<\/p>\s*$/, '');
  });
}

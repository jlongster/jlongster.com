import fm from 'front-matter';
import { mathFromMarkdown, mathToMarkdown } from 'mdast-util-math';
import { math } from 'micromark-extension-math';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import { format as formatDate } from 'date-fns';
import { parseProperties } from './parse-properties';

export function parse(str) {
  const { attributes: attrs, body } = fm(str);

  // We must include any extensions that require syntactic extension,
  // otherwise it may be parsed or converted back to md wrongly
  const ast = fromMarkdown(body, {
    extensions: [math()],
    mdastExtensions: [mathFromMarkdown()],
  });

  return {
    attrs,
    blocks: ast.children.map((n, idx) => ({
      type: n.type,
      order: idx,
      md: toMarkdown(n, { extensions: [mathToMarkdown()] }),
      string: toString(n),
      meta:
        n.type === 'code'
          ? {
              lang: n.lang,
              ...(n.meta ? parseProperties(n.meta) : null),
            }
          : null,
    })),
  };
}

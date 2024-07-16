import fm from 'front-matter';
import { mathFromMarkdown, mathToMarkdown } from 'mdast-util-math';
import { math } from 'micromark-extension-math';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import { parseProperties } from './parse-properties';

const STRING_CACHE = new Map();

function getStringForNode(node) {
  if (STRING_CACHE.has(node)) {
    return STRING_CACHE.get(node);
  }
  const str = toString(node).trim();
  STRING_CACHE.set(node, str);
  return str;
}

function stripId(str) {
  if (str.endsWith('^TOC')) {
    return str;
  }
  return str.replace(/\^[^\s]+$/, '').trim();
}

function idLookahead(nodes, idx) {
  for (let i = idx + 1; i < nodes.length; i++) {
    const str = getStringForNode(nodes[i]);

    if (str !== '') {
      if (str.match(/^\^[^\s]+$/)) {
        return str.slice(1);
      } else {
        break;
      }
    }
  }
}

export function parse(str) {
  const { attributes: attrs, body } = fm(str);

  // We must include any extensions that require syntactic extension,
  // otherwise it may be parsed or converted back to md wrongly
  const ast = fromMarkdown(body, {
    extensions: [math()],
    mdastExtensions: [mathFromMarkdown()],
  });

  const blocks = ast.children.map((n, idx) => {
    let meta = null;
    if (n.type === 'code') {
      meta = {
        lang: n.lang,
        ...(n.meta ? parseProperties(n.meta) : null),
      };
    } else if (n.type === 'heading') {
      meta = { depth: n.depth };
    }

    return {
      uuid: idLookahead(ast.children, idx, STRING_CACHE),
      type: n.type,
      order: idx,
      md: stripId(toMarkdown(n, { extensions: [mathToMarkdown()] })),
      string: stripId(getStringForNode(n, STRING_CACHE)),
      meta,
    };
  });

  return {
    attrs,
    blocks,
  };
}

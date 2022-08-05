let _blockLinker = null;
let _renderer = null;

export function setBlockLinker(linker) {
  _blockLinker = linker;
}

export function setRenderer(renderer) {
  _renderer = renderer;
}

function scrubName(name) {
  return name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');
}

export function tokenize(state, silent) {
  let start = state.pos;
  let marker = state.src.charCodeAt(start);

  if (silent) {
    return false;
  }

  if (
    marker !== 0x5b /* [ */ &&
    marker !== 0x5d /* ] */ &&
    marker !== 0x28 /* ( */ &&
    marker !== 0x29 /* ) */ &&
    marker !== 0x23 /* # */
  ) {
    return false;
  }

  let scanned = state.scanDelims(state.pos, true);

  for (let i = 0; i < scanned.length; i++) {
    let token = state.push('text', '', 0);
    token.content = String.fromCharCode(marker);

    state.delimiters.push({
      marker: marker,
      length: scanned.length,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close
    });
  }

  state.pos += scanned.length;

  return true;
}

function collapse(tokens) {
  return tokens.reduce((str, tok) => (str += tok.content || tok.markup), '');
}

export function postProcess(state) {
  let delimiters = state.delimiters;

  for (let i = delimiters.length - 1; i >= 0; i--) {
    let startDelim = delimiters[i];

    if (
      startDelim.marker !== 0x5b /* [ */ &&
      startDelim.marker !== 0x5d /* ] */ &&
      startDelim.marker !== 0x28 /* ( */ &&
      startDelim.marker !== 0x29 /* ) */ &&
      startDelim.marker !== 0x23 /* # */
    ) {
      continue;
    }

    let endDelim = startDelim.end !== -1 && delimiters[startDelim.end];

    let isRef =
      endDelim &&
      i > 0 &&
      delimiters[i - 1].end === startDelim.end + 1 &&
      delimiters[i - 1].marker === startDelim.marker &&
      delimiters[i - 1].token === startDelim.token - 1 &&
      delimiters[startDelim.end + 1].token === endDelim.token + 1;
    let isPageRef = isRef && startDelim.marker === 0x5b;
    let isBlockRef = isRef && startDelim.marker === 0x28;
    let isTag = startDelim.marker === 0x23;

    if (!isPageRef && !isBlockRef && !isTag) {
      continue;
    }

    if (isTag) {
      let token = { ...state.tokens[startDelim.token] };

      let tag = state.tokens[startDelim.token + 1];
      let parsed = tag.content.match(/(?:^|(?:[.!?]\s))([\w:.]+)/);
      if (parsed) {
        let full = tag.content;
        tag.content = parsed[0];
        let rest = { ...tag };
        rest.content = full.slice(tag.content.length);

        state.tokens.splice(startDelim.token + 2, 0, rest);
        state.tokens.splice(startDelim.token + 2, 0, token);
      } else {
        continue;
      }
    }

    let text = !isTag
      ? collapse(
          state.tokens.slice(
            startDelim.token + 1,
            delimiters[startDelim.end].token
          )
        )
      : state.tokens[startDelim.token + 1].content;

    if (text === 'TODO' || text === 'DONE') {
      continue;
    }

    if (isBlockRef) {
      // Erase all the content
      for (
        let t = delimiters[i - 1].token;
        t <= delimiters[startDelim.end + 1].token;
        t++
      ) {
        state.tokens[t].content = '';
      }

      let index = delimiters[i - 1].token;
      let target = state.tokens[index];

      let blockId = text;
      let blockText = _blockLinker.getBlockText(blockId);
      let inlineText;
      if (blockText) {
        inlineText = _renderer.renderBlockText(blockText, { inline: true });
      } else {
        inlineText = '(block unavailable)';
      }

      target.type = 'html_inline';
      target.content = `<span class="blockref">${inlineText}</span>`;
    } else {
      let pageId = _blockLinker.resolveRef(text);

      let token = state.tokens[startDelim.token];
      token.type = 'link_open';
      token.attrs = [
        pageId && ['href', _blockLinker.linkBlock(pageId)],
        [
          'class',
          'ref ' +
            (isPageRef ? 'brackets' : 'tag') +
            ' ref-name-' +
            scrubName(text)
        ]
      ].filter(Boolean);
      token.tag = 'a';
      token.nesting = 1;
      token.markup = isPageRef ? '[[' : isBlockRef ? '((' : '#';
      token.content = '';

      if (!isTag) {
        token = state.tokens[delimiters[startDelim.end].token];
      } else {
        token = state.tokens[startDelim.token + 2];
      }
      token.type = 'link_close';
      token.tag = 'a';
      token.attrs = [];
      token.nesting = -1;
      token.markup = isPageRef ? ']]' : isBlockRef ? '))' : '';
      token.content = '';

      if (!isTag) {
        state.tokens[delimiters[i - 1].token].content = '';
        state.tokens[delimiters[startDelim.end + 1].token].content = '';
      }
    }
  }
}

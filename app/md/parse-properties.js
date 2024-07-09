// This doesn't handle everything but it's a nice and simple approach
// for parsing key=value pairs of data with support for handling
// quoted strings (with escaped quotes etc)
//
// Ideally I'd avoid regexes for performance but regexes are an easy
// way to get support for matching a variety of unicode characters. I
// haven't actually benchmarked it though, maybe tiny regexes are just
// as good as implementing custom unicode matching?

function consumeKeyword(state) {
  // Look I hate this as much as you do, this feels terrible for
  // performance but since I want to use regex I need to copy part
  // of the string
  const rest =
    state.cursor < state.string.length ? state.string.slice(state.cursor) : '';

  const m = rest.match(/^\w+/);
  if (m) {
    const key = m[0];
    state.cursor += m[0].length;
    return key;
  }
  return null;
}

function consumeChar(state) {
  const c =
    state.cursor < state.string.length ? state.string[state.cursor] : '';

  if (c.match(/\S/)) {
    state.cursor++;
    return c;
  }
  return null;
}

function consumeValue(state) {
  // Yes I know, yikes, yolo etc. See `consumeKeyword` for perf
  // concerns here
  const rest = state.string.slice(state.cursor);

  // Strings
  if (rest[0] === '"') {
    let searchPoint = 1;
    while (true) {
      const endQuoteIdx = rest.indexOf('"', searchPoint);
      expectCondition(state, endQuoteIdx !== -1, 'unterminated string');

      if (rest[endQuoteIdx - 1] !== '\\') {
        // It's not an escaped quote, we can quit searching
        searchPoint = endQuoteIdx;
        break;
      }

      // We found an escaped quote, ignore it and keep going
      searchPoint = endQuoteIdx + 1;
    }

    // Return the string excluding the quotes. We also want to
    // "unescape" the quotes to bring them into string normally
    const str = rest.slice(1, searchPoint).replace(/\\"/g, '"');
    state.cursor += searchPoint + 1;
    return str;
  }

  // Numbers
  let m = rest.match(/^\d+/);
  if (m) {
    const num = parseInt(m[0]);
    state.cursor += m[0].length;
    return num;
  }

  // Boolean
  m = rest.match(/^\w+/);
  if (m) {
    const str = m[0];
    if (str === 'true' || str === 'false') {
      state.cursor += str.length;
      return str === 'true' ? true : false;
    }
  }

  return null;
}

function expectCondition(state, cond, msg) {
  if (!cond) {
    throw new Error(
      'Invalid syntax' +
        (msg ? ` (${msg})` : '') +
        `:${state.string.slice(state.cursor, state.cursor + 10)}`,
    );
  }
}

function expectWhitespace(state) {
  const initial = state.cursor;
  while (
    state.cursor < state.string.length &&
    state.string[state.cursor] === ' '
  ) {
    state.cursor++;
  }

  expectCondition(
    state,
    state.cursor === state.string.length || state.cursor > initial,
    'expected whitespace',
  );
}

export function parseProperties(str) {
  const props = {};

  let state = { cursor: 0, string: str.trim() };
  while (state.cursor < state.string.length) {
    const key = consumeKeyword(state);
    if (!key) {
      break;
    }

    const c = consumeChar(state);
    if (c) {
      expectCondition(state, c === '=', 'expected equals sign');

      const val = consumeValue(state);
      expectCondition(state, val != null);
      props[key] = val;
    } else {
      // No value provided acts like a bare DOM attribute which
      // defaults to true
      props[key] = true;
    }

    expectWhitespace(state);
  }

  return props;
}

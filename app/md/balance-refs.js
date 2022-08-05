function processDelimiters(state, delimiters) {
  if (delimiters.length === 0) {
    return;
  }

  let openers = [];

  for (let idx = 0; idx < delimiters.length; idx++) {
    let delim = delimiters[idx];

    if (delim.marker === 0x5b || delim.marker === 0x28) {
      openers.push(delim);
      continue;
    } else if (delim.marker === 0x5d || delim.marker === 0x29) {
      let opener = openers.pop();
      if (opener) {
        opener.end = idx;
        opener.open = true;
        delim.close = true;
      }
    }
  }
}

export default function balanceRefs(state) {
  var curr,
    tokens_meta = state.tokens_meta,
    max = state.tokens_meta.length;

  processDelimiters(state, state.delimiters);

  for (curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      processDelimiters(state, tokens_meta[curr].delimiters);
    }
  }
}

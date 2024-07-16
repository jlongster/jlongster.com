async function checkForRefresh() {
  let res;
  try {
    res = await fetch('/_refresh-event');
  } catch (e) {
    // This is a common error because the request is long-lived above,
    // so refresh the page manually will abort the request and throw
    // an error
    return;
  }

  if (res.status === 200) {
    const text = await res.text();

    // This string indicates we should refresh because content has
    // changed. I wanted to use a 408 timeout http code but that shows
    // errors in the console unfortunately
    if (text === 'refresh') {
      // This blows away the current query but that's ok for now. We
      // need to do this to force a bypass of any caches
      window.location = window.location.pathname + `?x=${Math.random()}`;
    } else if (text !== 'clear') {
      checkForRefresh();
    }
  }
}

checkForRefresh();

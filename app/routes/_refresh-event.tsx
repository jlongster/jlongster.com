// I used to support a set of pending listeners but I switched to only
// support one at a time. My previous implementation seemed easily
// susceptible to ddos attacks and I don't really need support for it
let LATEST_PENDING = null;

const TIMEOUT = 10000;

export function broadcast() {
  if (LATEST_PENDING) {
    LATEST_PENDING.refresh();
  }
  LATEST_PENDING = null;
}

function makeResponse(message) {
  let headers = new Headers();
  headers.set('Cache-Control', 'no-cache');
  return new Response(message, { status: 200, headers });
}

export async function loader({ request }) {
  return new Promise(resolve => {
    const refresh = () => {
      clearTimeout(timer);
      resolve(makeResponse('refresh'));
    };

    const clear = () => {
      clearTimeout(timer);
      resolve(makeResponse('clear'));
    };

    const timer = setTimeout(() => {
      resolve(makeResponse('timeout'));
      LATEST_PENDING = null;
    }, TIMEOUT);

    if (LATEST_PENDING) {
      LATEST_PENDING.clear();
    }
    LATEST_PENDING = { refresh, clear };
  });
}

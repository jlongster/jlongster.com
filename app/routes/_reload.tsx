import * as db from '../db';
import * as indexer from '../db/indexer';

export async function action({ request }) {
  if (request.method !== 'POST') {
    return null;
  }

  console.log('Reloading database...');

  try {
    // Reload the index
    indexer.load();

    // Clear any page caches
    db.clearCache();
    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
}

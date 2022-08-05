import * as db from '../db/query';

export async function action({ request }) {
  if (request.method !== 'POST') {
    return null;
  }

  console.log('Reloading database...');

  try {
    db.create();
    return new Response('ok', { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
}

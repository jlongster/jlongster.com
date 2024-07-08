import fs from 'fs';
import { verify } from '../auth/verify';
import { parse } from '../md/new/parse.js';
import { write } from '../db/new/db.js';

const publicKey = fs.readFileSync(__dirname + '/../public-key.key', 'utf8');

export function loader() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function action({ request }) {
  if (request.method !== 'POST') {
    return null;
  }

  let headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');

  // Get the data and verify it
  let data = await request.text();
  let signature = request.headers.get('X-JLONGSTER-SIGN');

  if (!verify(data, signature, publicKey)) {
    return new Response('', { status: 401, headers });
  }

  try {
    var parsed = JSON.parse(data);
  } catch (e) {
    return new Response('invalid json', { status: 400, headers });
  }

  if (parsed.title == null || parsed.content == null) {
    return new Response('invalid json shape', { status: 400, headers });
  }

  // Compile data into a db

  const { attrs, blocks } = parse(parsed.content);

  if (attrs.url == null) {
    return new Response('url is required', { status: 400, headers });
  }

  const uid = new URL(attrs.url).pathname.slice(1);
  write(uid, parsed.title, attrs, blocks);

  return new Response('ok', {
    status: 200,
    headers,
  });
}

import fs from 'fs';
import { join } from 'path';
import { verify } from '../auth/verify';
import { parse } from '../md/parse.js';
import { rootPath } from '../shared/util';
import { write } from '../db';
import { broadcast } from './_refresh-event';

const publicKey = fs.readFileSync(join(rootPath(), 'public-key.key'), 'utf8');

// This shows the log:
// curl -X GET http://localhost/_upload
//
// No log:
// curl -X GET http://localhost/_upload
//
// curl > remix

export function loader({ request }) {
  console.log('Loader called with method:', request.method);

  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

async function bustCloudflareCache() {
  if (process.env.CLOUDFLARE_TOKEN) {
    console.log('Busting cloudflare cache...');
    let res = await fetch(
      'https://api.cloudflare.com/client/v4/zones/b5b1c96eb1cea26c4d3de6e5d2839578/purge_cache',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      },
    );
    if (res.status !== 200) {
      console.log('Error busting cloudflare cache');
    }
  }
}

function errorResponse(msg, code = 400) {
  let headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(msg, { status: code, headers });
}

export async function action({ request }) {
  console.log('jwl', request.method);
  if (request.method === 'OPTIONS') {
    let headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response('', { status: 200, headers });
  } else if (request.method !== 'POST') {
    return null;
  }

  // Get the data and verify it
  let data = await request.text();
  console.log('jwl', JSON.stringify(data));
  let signature = request.headers.get('X-JLONGSTER-SIGN');

  if (data === '' || !verify(data, signature, publicKey)) {
    return errorResponse('signature check failed', 401);
  }

  try {
    var parsed = JSON.parse(data);
  } catch (e) {
    return errorResponse('invalid json');
  }

  if (parsed.title == null || parsed.content == null) {
    return errorResponse('invalid json shape');
  }

  // Compile data into a db

  const { attrs, blocks } = parse(parsed.content);

  if (attrs.id === null) {
    return errorResponse('id is required');
  }

  if (attrs.url == null) {
    return errorResponse('url is required');
  }

  try {
    var url = new URL(attrs.url).pathname.slice(1);
  } catch (e) {
    return errorResponse('url is invalid');
  }

  if (url.indexOf('/') !== -1) {
    return errorResponse('url must only be 1 level deep');
  }

  write(url, { ...attrs, title: parsed.title }, blocks);

  // Tell everybody to reload the db
  // let urls;

  // if (process.env.NODE_ENV === 'development') {
  //   urls = ['http://localhost:3000/_reload'];
  // } else {
  //   let address = `global.${process.env.FLY_APP_NAME}.internal`;
  //   let ipv6s = await resolve6(address);
  //   urls = ipv6s.map(ip => `http://[${ip}]:3000/_reload`);
  // }

  // let responses = await Promise.all(
  //   urls.map(async url => {
  //     let res = await fetch(url, { method: 'POST' });

  //     if (res.status !== 200) {
  //       res.text().then(text => console.log('ERROR', text));
  //     }

  //     return res.status;
  //   })
  // );
  // let failed = responses.some(status => status !== 200);

  await bustCloudflareCache();

  broadcast();

  let headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response('ok', { status: 200, headers });
}

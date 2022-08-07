import fs from 'fs';
import { join } from 'path';
import { verify } from '../auth/verify';
import { dataPath, create } from '../db/query';
import { resolve6 } from 'dns/promises';

const publicKey = fs.readFileSync(__dirname + '/../public-key.key', 'utf8');

function reload() {
  console.log('Reloading database...');
  create();
}

export async function action({ request }) {
  if (request.method !== 'POST') {
    return null;
  }

  // Get the data and verify it
  let data = await request.text();
  let signature = request.headers.get('X-JLONGSTER-SIGN');

  if (!verify(data, signature, publicKey)) {
    return new Response('', { status: 401 });
  }

  // Make sure it's valid JSON
  try {
    JSON.parse(data);
  } catch (e) {
    return new Response('invalid json', { status: 400 });
  }

  // Write it down to the volume
  fs.writeFileSync(join(dataPath, 'datoms.json'), data, 'utf8');

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

  let failed = false;
  try {
    reload();
  } catch (e) {
    console.log(e);
    failed = true;
  }

  if (process.env.CLOUDFLARE_TOKEN) {
    console.log('Busting cloudflare cache...');
    let res = await fetch(
      'https://api.cloudflare.com/client/v4/zones/b5b1c96eb1cea26c4d3de6e5d2839578/purge_cache',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ purge_everything: true })
      }
    );
    if (res.status !== 200) {
      console.log('Error busting cloudflare cache');
    }
  }

  let headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(failed ? 'failed' : 'ok', {
    status: failed ? 400 : 200,
    headers
  });
}

const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';
const TWEET_ID = /^[0-9]+$/;

function getToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, '');
}

export async function fetchTweet(id, fetchOptions) {
  var _res_headers_get;
  if (id.length > 40 || !TWEET_ID.test(id)) {
    throw new Error(`Invalid tweet id: ${id}`);
  }
  const url = new URL(`${SYNDICATION_URL}/tweet-result`);
  url.searchParams.set('id', id);
  url.searchParams.set('lang', 'en');
  url.searchParams.set(
    'features',
    [
      'tfw_timeline_list:',
      'tfw_follower_count_sunset:true',
      'tfw_tweet_edit_backend:on',
      'tfw_refsrc_session:on',
      'tfw_fosnr_soft_interventions_enabled:on',
      'tfw_show_birdwatch_pivots_enabled:on',
      'tfw_show_business_verified_badge:on',
      'tfw_duplicate_scribes_to_settings:on',
      'tfw_use_profile_image_shape_enabled:on',
      'tfw_show_blue_verified_badge:on',
      'tfw_legacy_timeline_sunset:true',
      'tfw_show_gov_verified_badge:on',
      'tfw_show_business_affiliate_badge:on',
      'tfw_tweet_edit_frontend:on',
    ].join(';'),
  );
  url.searchParams.set('token', getToken(id));

  const res = await fetch(url.toString(), fetchOptions);

  const isJson =
    (_res_headers_get = res.headers.get('content-type')) == null
      ? void 0
      : _res_headers_get.includes('application/json');

  const data = isJson ? await res.json() : undefined;

  if (res.ok) {
    return data?.__typename === 'TweetTombstone'
      ? { tombstone: true }
      : { data };
  }

  if (res.status === 404) {
    return {
      notFound: true,
    };
  }

  throw new Error({
    message:
      typeof data.error === 'string'
        ? data.error
        : `Failed to fetch tweet at "${url}" with "${res.status}".`,
    status: res.status,
    data,
  });
}

async function run() {
  const tweetId = process.argv[2];
  if (!tweetId) {
    console.error('Please provide a tweet ID.');
    process.exit(1);
  }

  // Fetch and display the tweet thread
  // getTweetThread(tweetId);

  fetchTweet(tweetId).then(t => {
    console.log(JSON.stringify(t));
  });
}

run();

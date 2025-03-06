import { spawn } from 'child_process';

// Your Twitter Bearer Token
const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAABk1cwAAAAAAzPofiORQ8qX48R6D9JgdQGEvp6E%3D7H2oDjXX8nD8hnOZauaDnvon7bxVKga6LRlU5qZpSM1gyUJrNe';

const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';
const TWEET_ID = /^[0-9]+$/;

function pbcopy(data) {
  var proc = spawn('pbcopy');
  proc.stdin.write(data);
  proc.stdin.end();
}

function getToken(id) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, '');
}

export async function fetchTweet(id) {
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

  const res = await fetch(url.toString());

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

async function getThreadedIds(tweetId) {
  const tweetResponse = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=conversation_id,author_id,created_at&expansions=author_id`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!tweetResponse.ok) {
    throw new Error(`Failed to fetch tweet: ${tweetResponse.statusText}`);
  }

  const tweetData = await tweetResponse.json();
  const tweet = tweetData.data;
  const authorId = tweet.author_id;
  const conversationId = tweet.conversation_id;

  // Get all tweets in the same conversation
  const threadResponse = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?query=conversation_id:${conversationId} from:${authorId}&tweet.fields=author_id,created_at,conversation_id,referenced_tweets&max_results=100`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!threadResponse.ok) {
    throw new Error(`Failed to fetch thread: ${threadResponse.statusText}`);
  }

  const threadData = await threadResponse.json();
  const threadTweets = threadData.data;

  threadTweets.forEach(tweet => {
    console.log(JSON.stringify(tweet));
  });

  // The first tweet should be the "root" and we want to pull all
  // direct replies afterwards. (tweets are already filtered by author
  // so this will pull in only the tweet thread and no replies from
  // other people)
  let tweets = [tweet.id];
  while (1) {
    const lastTweetId = tweets[tweets.length - 1];
    const reply = threadTweets.find(t =>
      t.referenced_tweets.find(
        t => t.type === 'replied_to' && t.id === lastTweetId,
      ),
    );
    if (reply == null) {
      break;
    } else {
      tweets.push(reply.id);
    }
  }

  return tweets;
}

// Get the tweet ID from command line argument
const tweetId = process.argv[2];
if (!tweetId) {
  console.error('Please provide a tweet ID.');
  process.exit(1);
}

function tweetToString(tweet, connect) {
  return (
    '```json tweet' +
    (connect ? ' connect' : '') +
    '\n' +
    JSON.stringify(tweet) +
    '\n```'
  );
}

async function run() {
  // Fetch and display the tweet thread
  const ids = await getThreadedIds(tweetId);
  // const ids = [
  //   '1896676928465338829',
  //   '1896677637416001627',
  //   '1896677910695886850',
  // ];
  console.log('got ids', ids);

  let str = '';
  for (let id of ids) {
    const tweet = (await fetchTweet(id)).data;
    if (str !== '') {
      str += '\n\n';
    }
    str += tweetToString(tweet, str !== '');
  }
  pbcopy(str);

  console.log('Tweet data copied to clipboard');
}

run();

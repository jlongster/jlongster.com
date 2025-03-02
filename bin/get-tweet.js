// Your Twitter Bearer Token
const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAABk1cwAAAAAAzPofiORQ8qX48R6D9JgdQGEvp6E%3D7H2oDjXX8nD8hnOZauaDnvon7bxVKga6LRlU5qZpSM1gyUJrNe';

// Function to get tweet thread
async function getTweetThread(tweetId) {
  try {
    // Get the main tweet and its conversation id
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

    console.log(JSON.stringify(tweet));

    // Get all tweets in the same conversation
    const threadResponse = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=conversation_id:${conversationId} from:${authorId}&tweet.fields=created_at&max_results=100`,
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

    // Sort tweets by creation time
    threadTweets.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    console.log(`Thread:\n`);
    threadTweets.forEach(tweet => {
      console.log(JSON.stringify(tweet));
    });
  } catch (error) {
    console.error('Error fetching tweet thread:', error.message);
  }
}

// Get the tweet ID from command line argument
const tweetId = process.argv[2];
if (!tweetId) {
  console.error('Please provide a tweet ID.');
  process.exit(1);
}

// Fetch and display the tweet thread
getTweetThread(tweetId);

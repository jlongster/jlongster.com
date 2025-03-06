import type { Tweet } from '../api/index.js';
import type { TwitterComponents } from './types.js';
import { TweetContainer } from './tweet-container.js';
import { TweetHeader } from './tweet-header.js';
import { TweetInReplyTo } from './tweet-in-reply-to.js';
import { TweetBody } from './tweet-body.js';
import { TweetMedia } from './tweet-media.js';
import { TweetInfo } from './tweet-info.js';
import { TweetActions } from './tweet-actions.js';
import { TweetReplies } from './tweet-replies.js';
import { QuotedTweet } from './quoted-tweet/index.js';
import { enrichTweet } from './utils.js';
import { useMemo } from 'react';

export const EmbeddedTweet = ({ tweet: t, connect }: Props) => {
  const tweet = useMemo(() => enrichTweet(t), [t]);

  return (
    <TweetContainer connect={connect}>
      <TweetHeader tweet={tweet} />
      <TweetBody tweet={tweet} />
      {tweet.mediaDetails?.length ? <TweetMedia tweet={tweet} /> : null}
      {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
    </TweetContainer>
  );
};

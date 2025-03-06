'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { MediaAnimatedGif, MediaVideo } from '../api/index.js';
import {
  EnrichedQuotedTweet,
  type EnrichedTweet,
  getMediaUrl,
  getVideo,
} from './utils.js';
import mediaStyles from './tweet-media.module.css';
import s from './tweet-media-video.module.css';

type Props = {
  tweet: EnrichedTweet | EnrichedQuotedTweet,
  media: MediaAnimatedGif | MediaVideo,
};

export const TweetMediaVideo = ({ tweet, media }: Props) => {
  const [playButton, setPlayButton] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const videos = getVideo(media);
  let timeout = 0;

  return (
    <>
      <video
        className={mediaStyles.image}
        poster={getMediaUrl(media, 'small')}
        controls={false}
        playsInline
        preload="none"
        tabIndex={playButton ? -1 : 0}
      >
        {videos.map(v => (
          <source src={v.url} type={v.content_type} />
        ))}
      </video>
      <button
        type="button"
        className={clsx(s.videoButton, 'tweet-play-button')}
        aria-label="View video on X"
      >
        <svg
          viewBox="0 0 24 24"
          className={s.videoButtonIcon}
          aria-hidden="true"
        >
          <g>
            <path d="M21 12L4 2v20l17-10z" />
          </g>
        </svg>
      </button>
      <div className={clsx(s.watchOnTwitter, 'tweet-watch-on-twitter')}>
        <a
          href={tweet.url}
          className={s.anchor}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on X
        </a>
      </div>
    </>
  );
};

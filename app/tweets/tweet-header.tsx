import clsx from 'clsx';
import type { EnrichedTweet } from './utils.js';
import type { TwitterComponents } from './types.js';
import { AvatarImg } from './avatar-img.js';
import s from './tweet-header.module.css';
import { VerifiedBadge } from './verified-badge.js';
import { TweetInfoCreatedAt } from './tweet-info-created-at.js';

export const TweetHeader = ({ tweet, components }) => {
  const Img = components?.AvatarImg ?? AvatarImg;
  const { user } = tweet;

  return (
    <div className={s.header}>
      <a
        href={user.url}
        className={s.avatar}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div
          className={clsx(
            s.avatarOverflow,
            user.profile_image_shape === 'Square' && s.avatarSquare,
          )}
        >
          <Img
            src={user.profile_image_url_https}
            alt={user.name}
            width={48}
            height={48}
          />
        </div>
        <div className={s.avatarOverflow}>
          <div className={s.avatarShadow} />
        </div>
      </a>
      <div className={s.author}>
        <div className={s.authorData}>
          <a
            href={user.url}
            className={s.authorLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={s.authorLinkText}>
              <span title={user.name}>{user.name}</span>
            </div>
          </a>
        </div>

        <div className={s.authorMeta}>
          <div className={s.authorFollow}>
            <span title={`@${user.screen_name}`}>@{user.screen_name}</span>

            <span className={s.separator}>&middot;</span>

            <a
              href={user.follow_url}
              className={s.follow}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow
            </a>

            <span className={s.separator}>&middot;</span>

            <TweetInfoCreatedAt tweet={tweet} />
          </div>
        </div>
      </div>

      <a
        href={tweet.url}
        className={s.brand}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on Twitter"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={s.twitterIcon}>
          <g>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </g>
        </svg>
      </a>
    </div>
  );
};

import type { ReactNode } from 'react';
import clsx from 'clsx';
import s from './tweet-container.module.css';
import './theme.css';

type Props = { className?: string, children: ReactNode };

export const TweetContainer = ({ className, connect, children }: Props) => (
  <>
    {connect && <div className={s.connector} />}
    <div className={clsx('react-tweet-theme', s.root, className)}>
      <article className={s.article}>{children}</article>
    </div>
  </>
);

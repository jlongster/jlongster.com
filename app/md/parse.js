import ds from 'datascript';

import { create, persist, load } from '../db/new/db.js';
import { parse } from '../md/new/parse.js';
import { renderBlock } from '../md/new/render.js';

const str = `---
public: false
url: https://jlongster.com/little-learnings
tags:
  - foo
  - bar
series:
date: 2024-07-08
---

## bar

This is a _link_: [go here](http://jlongster.com)

http://jlongster.com

$O^2 + 5 * O_1$

O^2

O$_2$

* foo
* bar
* baz

This is code: \`blah\`




\`\`\`js position=true
function fff() {
}
\`\`\`
`;

const { attrs, blocks } = parse(str);

console.log(blocks.slice(6))

let conn = create('foo', attrs, blocks);

persist(conn, 'foo');

// And then use `katex` CSS to typeset it:
// <link
// href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" rel="stylesheet">
// from https://github.com/remarkjs/remark-math

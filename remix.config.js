/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  serverModuleFormat: 'cjs',
  serverDependenciesToBundle: [
    'mdast-util-to-hast',
    'hast-util-to-html',
    'html-void-elements',
    'property-information',
    'zwitch',
    'stringify-entities',
    /.*/,
    /^micromark.*/,
    /^unist.*/,
    'trim-lines',
    'devlop',
  ],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
};

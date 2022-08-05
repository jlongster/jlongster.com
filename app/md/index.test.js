import md from './index.js';

console.log(md.render('foo [[dfdsf]] '));
console.log(md.render('foo [[bar]] #foo'));
console.log(md.render('foo [[bar]] #foo [[dfdsf]]'));
console.log(md.render('foo [[bar]] fds#fsd [[dfdsf]] sdfds'));

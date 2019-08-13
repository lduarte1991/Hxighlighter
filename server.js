const http = require('http');
const connect = require('connect');
const serveStatic = require('serve-static');

const app = connect().use(serveStatic('dist/'));
http.createServer(app).listen(9000, () => { console.log('Listening...'); });

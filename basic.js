var restify = require('restify');
const restq = require('restify').plugins;

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

var server = restify.createServer();
server.use(restq.bodyParser());

server.get('/hello/:name', respond);
server.post('/test/:none', function(req,res,next) {
  console.log(req.body);
});
server.head('/hello/:name', respond);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

var restify = require('restify');
var base64 = require('base-64');
const restq = require('restify').plugins;
var secureRandom = require('secure-random');
var bcrypt = require('bcrypt-nodejs');

var accounts = {};


var saltRounds = 10;


function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  console.log(req.body);
  console.warn("test");
  next();
}

function updateGamestate(req, res) {

  if(validate(req.body.username, req.body.password)) {
    console.log(req.body.profile);
    accounts[req.body.username].profile = req.body.profile;
    console.log(accounts);
    sendLoginMessage(res, "Success");
    return;
  } else {
    console.log("Received invalid request");
    console.log(req.body.username);
    console.log(req.body.password);

    sendErrorMessage(res, "Unvalidated GameState");
    return;
  }
}

function validate(username, password, res) {
  if (!(username in accounts)) {
    return false;
  }

  var seed = accounts[username].userSalt;
  var hash = accounts[username].userPasswordHash;

  return bcrypt.compareSync(password, hash);
}

function loginProcess(req, res, next) {
  console.log("Loginrequest");
  if(validate(req.body.username, req.body.password, res)) {
    sendLoginMessage(res, "Login successful");
    return;
  } else {
    sendErrorMessage(res, 'Wrong username or password.');
    return;
  };

}

function registerRequestProcess(req, res, next) {

  if (!('password' in req.body) || !('username' in req.body)) {
    console.log('Invalid request! Field pw or username was not set!');
    sendErrorMessage(res, "No Password or username was sent");
    return;
  }

  if (!(validateEmail(req.body.username))) {
    sendErrorMessage(res, "Email was invalid");
    console.log('invalid');
    return;
  }

  if ((req.body.username in accounts)) {
    sendErrorMessage(res, 'Account with ' + req.body.username + 'already exists');
    console.log('exists');
    return;
  }

  //Create account.
    var salt = bcrypt.genSaltSync(10);
    bcrypt.hash(req.body.password, salt, null,function(err, hash) {
        accounts[req.body.username] = {
          userEmail: req.body.username,
          accountCreationDate: new Date(),
          userPasswordHash: hash
        };

          console.log(err);
          console.log(req.body.password);
          console.log(accounts);
    });

  console.log(accounts);
  sendLoginMessage(res, "Account registered successful");
}

function sendLoginMessage(res, successmessage) {
  res.send(200, {
    error: successmessage
  });
}

function sendErrorMessage(res, errormessage) {
  res.send(400, {
    error: errormessage
  });
}

var server = restify.createServer();
server.use(restq.bodyParser());

server.get('/hello/:name', respond);

server.post('/register/:none', registerRequestProcess);
server.post('/login/:none', loginProcess);

server.post('/state/:none', updateGamestate);

server.head('/hello/:name', respond);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
  console.log("Doing this!");
});



//////////

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

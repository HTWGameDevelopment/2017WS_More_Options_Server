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
    accounts[req.body.username].profile.date = new Date(accounts[req.body.username].profile.date);
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

function getLatestSaveGame(req, res, next) {
  if(!validate(req.body.username, req.body.password, res)) {
    sendErrorMessage(res, "Unvalidated access");
    return;
  }

if (! (('profile') in req.body)) {
  // name not in local
  if (! (('profile') in accounts[req.body.username])) {
      // name not in cloud and not in local
      sendErrorMessage(res, 'No profile found in local or server');
      return;
  } else {
    // name in cloud but not in local
    sendGameState(res, accounts[username].profile);
    console.log("Name in cloud but not in local");
    return;
  }

} else {
// name in local
  if ((('profile') in accounts[req.body.username])) {
    // name in local and server
    var clientProfile = req.body.profile;
    var serverProfile = accounts[req.body.username].profile;
    if(isServerProfileMoreRecent(clientProfile, serverProfile)) {
      sendGameState(res, serverProfile);
      console.log("Server more Recent");
    } else {

      sendGameState(res, serverProfile);
      console.log("Local more recent");
    }

  } else {
    // name in local but not server
    sendErrorMessage(res, "Client name is in local but not on cloud");
    console.log("Name is in local but not in cloud");
  }
}
console.log("Called function");
}

function isServerProfileMoreRecent(clientProfile, serverProfile) {
  console.log("Client:" + clientProfile);
  console.log("Server:" + serverProfile);
  var cDate = new Date(clientProfile.date);
  var sDate = new Date(serverProfile.date);

  console.log("ClientProfileIgnored: " + clientProfile.ignored);
  if (clientProfile.ignored) {
    return true;
  }
  return (sDate.getTime() > cDate.getTime());
}

function sendGameState(res, profile) {
  res.send(200, {
    serverprofile: profile
  });
  console.log("Sending GameState");
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
  console.log("Loginrequest by User: " + req.body.username + "with Password: " + req.body.password);
  if(validate(req.body.username, req.body.password, res)) {
    sendLoginMessage(res, "Login successful");
    return;
  } else {
    sendErrorMessage(res, 'Wrong username or password.');
    console.log("Invalid login request with " + req.body.username + " and  " + req.body.password);
    console.log(accounts);
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
    console.log('invalid email');
    return;
  }

  if ((req.body.username in accounts)) {
    sendErrorMessage(res, 'Account with ' + req.body.username + 'already exists');
    console.log('account with username '+req.body.username +'exists already');
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

  console.log("logged in with " + req.body.username + " and  " + req.body.password);
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
  console.log("Sending Error Message" + errormessage);
}

var server = restify.createServer();
server.use(restq.bodyParser());


server.post('/register/:none', registerRequestProcess);
server.post('/login/:none', loginProcess);

server.post('/state/:none', updateGamestate);
server.post('/stateRequest/:none', getLatestSaveGame);

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

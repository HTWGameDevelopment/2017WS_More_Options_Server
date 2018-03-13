//Node.js IMPORTS
var restify = require('restify');
var base64 = require('base-64');
const restq = require('restify').plugins;
var secureRandom = require('secure-random');
var bcrypt = require('bcrypt-nodejs');
var MongoClient = require('mongodb').MongoClient;

//CONSTS
var BAD_REQUEST_TAG = "[BAD REQUEST]";
var REGISTER_TAG = "[REGISTER]";
var ERROR_TAG = "[ERROR]";
var SUCCESS_TAG = "[SUCCESS]";


//ServerData
var accounts = {};

//Mongo VARS
var dbname = "moreOptions";
var mongoDBurl = "mongodb://localhost:27017/";
var collectionName = "accounts";

var dbo;

//BCrypt VARS
var saltRounds = 10;
//Restify SETUP
var server = restify.createServer();
server.use(restq.bodyParser());

server.get('/', function(req, res, next) {
  dbo.collection(collectionName).findOne({}, function(err, result) {
      if (err) throw err;
      console.log(result);
      res.send(result);
      return next();
    });
});

server.post('/register',
  function(req, res, next) {
    console.log("Call to register");
    if(isRequestWellFormed(req)) {
        if(validateEmail(req.body.username)) return next();
        else sendBadRequest(res, "Invalid Email");
    } else {
      sendBadRequest(res, "Missing Password or Email");
    }
  },
  function(req, res, next) {
    dbo.collection(collectionName).findOne({email : req.body.username}, function(err, result) {
        if (err) throw err;
        if(result == null) {
          return next();
        } else {
          sendErrorMessage(res, "Email already registered");
        }
      });
  },
  function(req, res, next) {
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(req.body.password, salt,null, function(err, hash) {
          if(err) throw err;
          else {
            var user = new User(req.body.username, hash);
            accounts[user.email] = user;
            registerUserMongoDB(user, next);
          }
        });
    });
  },
  function(req, res, next) {
      sendSuccessMessage(res, "Registered successfully");
  }
);

server.post('/login',
    function(req,res,next) {
      console.log("Call to login");
      if(isRequestWellFormed(req)) {
        var user = new User(req.body.username, req.body.password);

        verifyUser(res, user, next);
      } else sendBadRequest(res, "Invalid LoginData");
    }, function(req, res, next) {
      sendSuccessMessage(res, "Login successful");
    }
);

server.post('/updateGamestate',
  function(req, res, next) {
    console.log("Call to updateGamestate");
    if (isRequestWellFormed(req)
        && 'profile' in req.body) {
          var user = new User(req.body.username, req.body.password);
          var profile = req.body.profile;
          console.log("ProfileLog: " + profile);
          verifyUser(res, user, next);
        } else {
          sendBadRequest(res, "Invalid Request");
        }
    }, function(req, res, next) {
      sendSuccessMessage(res, "Updated profile successfully");

      // aktualisiere DB
      updateUserProfile(req.body.username, req.body.profile);
    }
);

server.get('/compare/:username',
  function(req, res, next) {
    console.log("Call to compare");
    console.log("ReqParamsUsername: " + req.params.username);
    // ist user mit der email lokal vorhanden
    var username = req.params.username;
    if (username in accounts) {
      var profile = accounts[user.email].profile;
      // username lokal vorhanden --> schicke profil vom Spieler
      sendGamestate(res, profile);
    } else {
      // Prüfe ob Username in DB vorhanden
      findUserWithoutVerification(req, res, username, next);
    }
  }, function(req, res, next) {
    console.log("ReqProfile: " + req.profile);
    sendGamestate(res, req.profile);
  }
);

server.post('/latestSaveGame',
  function(req, res, next) {
    console.log("Call to latestSaveGame");
    console.log("ReqParamsUsername: " + req.body.username);
    // ist user lokal vorhanden
    var username = req.body.username;
    var profile;
    if (username in accounts) {
      // user lokal vorhanden --> nimm aktuellstes SaveGame
      console.log("latestSaveGame: user available locally");
      profile = accounts[user.email].profile;

      // prüfe, welches Profil aktueller ist
      if (isServerProfileMoreRecent(req.profile, profile)) {
        // Server ist aktueller
        console.log("latestSaveGame: Server is more recent");
        sendGamestate(res, profile);
      } else {
        // Client ist aktueller
        console.log("latestSaveGame: Client is more recent");
        sendGamestate(res, req.profile);
      }
    } else {
      // Prüfe ob user in DB vorhanden
      profile = getUserFromDatabase(req, res, username, next);

      if (isServerProfileMoreRecent(req.profile, profile)) {
        // Server ist aktueller
        console.log("latestSaveGame: Server is more recent");
        sendGamestate(res, req.profile);
      } else {
        // DB-Client ist aktueller
        console.log("latestSaveGame: DB-Client is more recent");
        sendGameState(res, profile);
      }
    }
  }
);

function verifyUser(res, user, next) {
  if(user.email in accounts) {
    // User ist lokal im accounts-Array
    // Vergleiche Passwörter
    verifyLoginData(res, user, next);
  } else {
    // User nicht in lokal --> Check DB
    findUser(res, user, next);
  }
}

function verifyLoginData(res, user, next) {
  console.log("userPW: " + user.password);
  console.log("serverPW" + accounts[user.email].password);

  var compareUser = accounts[user.email];

  bcrypt.compare(user.password, compareUser.password, function(err, result) {
    if(err) throw err;
    if(result) next();
    else {
      console.log(bcrypt.compareSync(user.password, compareUser.password));
      sendBadAuthentication(res, "Wrong password");
    }
  });
}



//server.post('/register/:none', register);
//server.post('/login/:none', login);

//server.post('/state/:none', updateGamestate);
//server.post('/stateRequest/:none', getLatestSaveGame);

//server.head('/hello/:name', respond);

function startRestifyServer() {
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}
//MongoDB Functions
function connectToMongoDB() {
  console.log("Connecting to MongoDB..");
  MongoClient.connect(mongoDBurl, function(err, db) {
    if (err) throw err;
    dbo = db.db(dbname);
    console.log("Connected to MongoDB!");
    startRestifyServer();
  });
}

function registerUserMongoDB(user, next) {
  dbo.collection(collectionName).insertOne(user, function(err, res) {
    if (err) throw err;
    console.log("Inserted User: " + user + "into Database");
    return next();
  });
}

function getUserFromDatabase(req, res, emailParam, next) {
  dbo.collection(collectionName).findOne({email: emailParam}, function(err, result) {
    if (err) throw err;
    console.log("Found User: " + result.email);
    req.profile = result.profile;
    return result.profile;

    if (result == null) {
      sendBadAuthentication(res, "No User found");
    }
  });
}

function findUserWithoutVerification(req, res, emailParam, next) {
  dbo.collection(collectionName).findOne({email: emailParam}, function(err, result) {
    if (err) throw err;
    console.log("Found User: " + result.email);
    req.profile = result.profile;
    return next();

    if (result == null) {
      sendBadAuthentication(res, "No User found");
    }
  });
}

function findUser(res, user, next) {
  dbo.collection(collectionName).findOne({email : user.email}, function(err, result) {
    if (err) throw err;
    console.log("Found User: " + user.email);

    if (result == null) {
      sendBadAuthentication(res, "No User found");
    } else {
      accounts[user.email] = result;
      verifyLoginData(res, user, next);
    }
  });
}

function updateUserProfile(emailParam, profileParam) {
  var query = { email: emailParam};
  var newVal = { $set: {profile: profileParam}};
  dbo.collection(collectionName).updateOne(query, newVal, function(err) {
    if (err) throw err;
    console.log("Updated UserProfile");
  });
}

function isServerProfileMoreRecent(clientProfile, serverProfile) {
  console.log("Client: " + clientProfile);
  console.log("Server: " + serverProfile);

  var cDate = new Date(clientProfile.date);
  var sDate = new Date(serverProfile.date);

  return (sDate.getTime() > cDate.getTime());
}

//Helperfunctions

function sendBadAuthentication(res, error) {
  res.send(401, {message: error});
  console.log(BAD_REQUEST_TAG + error);
}
function sendBadRequest(res, error) {
  res.send(400, {message: error});
  console.log(BAD_REQUEST_TAG + error);
}

function sendErrorMessage(res, error) {
  res.send(200, {message: error});
  console.log(ERROR_TAG + error);
}

function sendSuccessMessage(res, error) {
  res.send(200, {message: error});
  console.log(SUCCESS_TAG + error);
}

function sendGamestate(res, profileParam) {
  res.send(200, {profile: profileParam});
  console.log("Gamestate sent successfully");
}

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

function isRequestWellFormed(req) {
  if (!('password' in req.body) || !('username' in req.body)) {
    console.log('Invalid request! Field pw or username was not set!');
    sendBadRequest(res, "No Password or username was sent");
    return false;
  }
  return true;
}

//Constructors

function User(useremail, passwordHash) {

  var user = {
    email : useremail,
    password : passwordHash
  };
  return user;

}

//ENTRY POINT
dbo = connectToMongoDB(); // Launch MongoDB -> Launch RestifyServer

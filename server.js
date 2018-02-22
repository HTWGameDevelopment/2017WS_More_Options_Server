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
    console.log(REGISTER_TAG + "Received request");
    if (!('password' in req.body) || !('username' in req.body)) {
      console.log('Invalid request! Field pw or username was not set!');
      sendBadRequest(res, "No Password or username was sent");
      return;
    }

    if(validateEmail(req.body.username)) return next();
    else sendBadRequest(res, "Invalid Email");

  },
  function(req, res, next) {
    dbo.collection(collectionName).findOne({email : req.body.username}, function(err, result) {
        if (err) throw err;
        if(result == null) {
          sendBadRequest(res, "Fick dich");
        } else {
          sendErrorMessage(res, "Email already registered");
        }
        return next();
      });
  }
);

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

//Helperfunctions

function sendBadRequest(res, error) {
  res.send(400, {message: error});
  console.log(BAD_REQUEST_TAG + error);
}

function sendErrorMessage(res, error) {
  res.send(200, {message: error});
  console.log(ERROR_TAG + error);
}

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

//ENTRY POINT
dbo = connectToMongoDB(); // Launch MongoDB -> Launch RestifyServer

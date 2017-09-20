var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// passport and sessions are required, so add them here.
// You'll have to 'npm install' these.
const passport = require('passport');
const session = require('express-session');

// requirements for openid-client, as well as reading in the key we generated
const fs = require('fs'); // used to read in the key file
const jose = require('node-jose'); // used to parse the keystore
const Issuer = require('openid-client').Issuer; 
const Strategy = require('openid-client').Strategy;

// filename for the keys
const jwk_file = "./full_key.jwk";

// OpenID Connect provider url for discovery
const oidc_discover_url = "https://mitreid.org";

// Params for creating the oidc client
const client_params = {
	client_id: 'login-nodejs-govt-test',
	token_endpoint_auth_method: 'private_key_jwt'
};

// Params for the OIDC Passport Strategy
const strat_params = {
	redirect_uri: 'http://localhost:3000/openid-connect-login',
	scope: 'openid profile email phone address',
	response: ['userinfo']
};


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Here we'll set up using server side sessions
// this is using an in memory system. Use something like memcached or redis in production
app.use(session({ secret: 'ourapplicationsecret', // change this
		  resave: false,
		  saveUninitialized: false}));

// initialize passport here
app.use(passport.initialize());
app.use(passport.session());

// passport has to serialize/deserialize users to the sessions.
//  This is a simple case
passport.serializeUser((user, done) => { done(null, user);});
passport.deserializeUser((user, done) => { done( null, user);});

// demo authentication routes
const authroutes = require('./routes/authenticated_routes')(app,passport);

// load keystore and set up openid-client
const jwk_json = JSON.parse(fs.readFileSync(jwk_file, "utf-8"));
// load the keystore. returns a Promise
let load_keystore = jose.JWK.asKeyStore(jwk_json);
// discover the Issuer. returns a Promise
//   you can also set this up manually, see the project documentation
let discover_issuer = Issuer.discover(oidc_discover_url);

// Create a client, and use it set up a Strategy for passport to use
// since we need both the Issuer and the keystore, we'll use Promise.all()
Promise.all([load_keystore, discover_issuer])
	.then(([ks, myIssuer]) => {
		console.log("Found Issuer: ", myIssuer);
		const oidc_client = new myIssuer.Client(client_params, ks);
		console.log("Created client: ", oidc_client);
		
		// create a strategy along with the function that processes the results
		passport.use('oidc', new Strategy({client: oidc_client, params: strat_params}, (tokenset, userinfo, done) => {
			// we're just loging out the tokens. Don't do this in production
			console.log('tokenset', tokenset);
			console.log('access_token', tokenset.access_token);
			console.log('id_token', tokenset.id_token);
			console.log('claims', tokenset.claims);
			console.log('userinfo', userinfo);
			
			// to do anything, we need to return a user. 
			// if you are storing information in your application this would use some middlewhere and a database
			// the call would typically look like
			// User.findOrCreate(userinfo.sub, userinfo, (err, user) => { done(err, user); });
			// we'll just pass along the userinfo object as a simple 'user' object
			return done(null, userinfo);
		}));
	}) // close off the .then()
	.catch((err) => {console.log("Error in OIDC setup", err);});


app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

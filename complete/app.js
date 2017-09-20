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

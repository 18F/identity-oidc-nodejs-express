# oidc_nodejs_demo
Small demo Node.js Express application using private keys and OpenID Connect

## What you'll build
You'll build an Express web application with a login backed by OpenID Connect

## What you'll need
- [Node.js](https://nodejs.org/) : This guide uses v8.5.0
 
## Create an unsecured web application
Once Node.js is installed, we're ready to setup our project.
We'll use the [Express Generator](https://expressjs.com/en/starter/generator.html) to set up the scafold of our project.

Install the generator globally
`$ npm install express-generator -g`

Next we'll generate our application using the [Pug template engine](https://github.com/pugjs/pug) (Which was formally called `Jade`). We'll change into the resulting directory and run `npm install` to finish setting up the dependencies.

```
 $ express --view=pug myapp
 $ cd myapp
 myapp$ npm install
```

At this point executing `DEBUG=myapp:* npm start` will start the server and you should be able to go to [http://localhost:3000/](http://localhost:3000) and see the Express landing page.

## Generate RSA keys
If you are going to be using signed keys rather than a `client-secret` for authenticating your client to the OpenID Connect server, you'll need to gerenrate them. We'll be using the `node-jose` library to do this. **NOTE:** in order for the `node-jose` library to use `RSA256` keys, it requires all the optional parameters for the private key, and not just the required `d` parameter. To accomidate this, we'll use the `node-jose` library to generate our keys.

Install the `node-jose` library while in your `myapp` directory with:
```
myapp$ npm install node-jose --save
```

Next you'll want to add the `generate_keys` file and execute it to generate a public key in `pub_key.jwk` and the private key in `full_key.jwk`. Use the contents of the `pub_key.jwk` file when you register your client.

## Set up Passport and `openid-client`
[Passport](http://passportjs.org/) makes it easy to add authentication to an Express application with a variaty of backends. Since we'll also want to make sure we're not re-logging in a user on every page hit, we'll want to add server side sessions with `express-session`.

```
myapp $ npm install express-session --save
myapp $ npm install passport --save
```
Next we'll set these up by modifying `app.js`.

Near the top, add in the require statements. 

```
...
var app = express();

// passport and sessions are required, so add them here.
// You'll have to 'npm install' these.
const passport = require('passport');
const session = require('express-session');
...
```

**NOTE** The express generator uses the `var` format from Node.js v6, which is ok, but we'll add in our new lines with v8 `const` syntax.

A bit further down in `app.js` we'll initialize things. First the session management with the `app.use(session(...));` line. Then we'll initialize passport and tell it to use the sessions.

Lastly we'll tell passport how to serialize/deserialize users to the session, with a very simple function. (I imagine for more complicated applications these might be expanded.)

```
...
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
...
```

### Set up `openid-client`
Now we need to setup the openid-client which is how we'll connect to the openid-connect provider using the keys we generated earlier.

First we'll install it
```
myapp$ npm install openid-client --save
```

Next we'll add it to `app.js` and set up a `Strategy` for `passport` to use. Add the following after the passport `require()` statements you added before

```
// requirements for openid-client, as well as reading in the key we generated
const fs = require('fs'); // used to read in the key file
const jose = require('node-jose'); // used to parse the keystore
const Issue = require('openid-client').Issuer;
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
```

Next we'll actually set up the OIDC Strategy. Add the following after the passport serialization code we added above
```
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
```

Now all that is left is to set up the callback URL and add authentication requirements to protected URLs.

### Setting up a protected page

We'll place all our authentication related routes in a single place `routes/authenticated_routes.js`. This file exports  a single function that adds routes to the app, along with the required `passport.autenticate(...)` calls. There is a second function in the file `isLoggedIn(req, res, next)` which is a helper function for locking down a new route. (In this case the `/profile` route).

```
module.exports = function(app, passport) {
    app.get('/login', passport.authenticate('oidc'));

    // OIDC Callback
    app.get('/openid-connect-login', passport.authenticate('oidc', {successRedirect:'/profile', failureRedirect:'/'}));

    app.get('/profile', isLoggedIn, function(req, res){
        console.log("In profile");
        res.render('profile', {title: 'Express - profile', user: req.user.name});
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        console.log("Is authenticated");
        return next();
    }
    console.log("Not Authenticated");
    res.redirect('/');
}
```
Next we have to add this to the app.js file with the line:
```
// demo authentication routes
const authroutes = require('./routes/authenticated_routes')(app,passport);
```

The only restriction on that line is it has to be after `app.use(passport.initialize());` is called, but it can be before we set up the Strategy.

Since we're adding a `/profile` page, we'll need a view. To keep things simple, we'll just pass in the name from the user object and put it in the text.

Add `views/profile.pug`:
```
extends layout

block content
  h1= title
  p Welcome, #{user}

  a(href="/logout") Logout
```
**NOTE** Logging out will only log you out of the Express app. If you are still logged into the OpenID Connect Provider, you'll just get automatically logged back in by clicking `/login`.

While we're at it, we'll add in a '/login' link to the index page. If we're sucessful on login, we'll get forwarded to the `/profile`.

Change `views/index.pug` to:
```
extends layout

block content
  h1= title
  p Welcome to #{title}

  a(href='/login') Login Here
```

Now start it up and hit [http://localhost:3000/](http://localhost:3000) with:
```
 DEBUG=myapp:* npm start
```

## Summary
 - We set up an express app using the express generator (found in `initial_app/`)
 - We added the ability to generate secure keys for authenticating with an OpenID Connect provider using `node-jose`. (found in `generate_keys/`)
 - Lastly we integrated OpenID Connect with our express application using `openid-client` (found in `complete/`)


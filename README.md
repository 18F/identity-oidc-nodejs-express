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

## Summary

## See Also

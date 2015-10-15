#node-voice-reference-app

  This application demonstrates how to implement voice calling for mobile devices, browsers (WebRTC), and any SIP client using the Bandwidth
    Application Platform.
    This reference application makes creating, registering, and implementing voice calling for endpoints (mobile, web, or any SIP client) easy.
    This application implements the steps documented [here](http://ap.bandwidth.com/docs/how-to-guides/use-endpoints-make-receive-calls-sip-clients/).

You can open up the web page at the root of the deployed project for more instructions and for example of voice calling in your web browser using WebRTC.
Current browser supported: Chrome and Opera.

## Install
Before running, fill config file (config.json) with right values:

`domain` - domain name (it will be created by the app if need),

`catapultUserId`, `catapultApiToken`, `catapultApiSecret` - auth data for Catapult API (to search and reserve a phone number, etc)

`baseUrl` - base url of this site for external access (like http://<your-site>.heroku.com),
`databaseUrl` - url to mongodb database (keep it empty to use local mongodb server)

After that run `npm install`  to install dependencies.

If you use node < 0.12 please run `npm install bluebird` to add promisses support (node 0.12+ has native promoses implementation).

You can run this demo  like `node index.js` on local machine if you have ability to handle external requests or use any external hosting.

## Deploy on Heroku

Create account on [Heroku](https://www.heroku.com/) and install [Heroku Toolbel](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up) if need.

Open `config.json` and fill it with valid values (except `baseUrl`).

Commit your changes.

```
git add .
git commit -a -m "Deployment"
```

Run `heroku create` to create new app on Heroku and link it with current project.

Run `heroku addons:create mongolab` to add mongodb support. 

Change option `baseUrl` in `config.json` by assigned by Heroku value (something like http://XXXX-XXXXXX-XXXX.heroku.com). Commit your changes by `git commit -a`. 

Run `git push heroku master` to deploy this project.

Run `heroku open` to see home page of the app in the browser


## Http routes

```
GET /users/{userName} with json response

PUT /users/{userName}

DELETE /users/{userName}

POST /users with required json payload {"userName": "", "password": "" }  and with json response (register an user)

POST /users/{userName}/callback with json payload (handle Catapult call events)
```

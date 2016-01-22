#node-voice-reference-app

  This application demonstrates how to implement voice calling for mobile devices, browsers (WebRTC), and any SIP client using the [Catapult API](http://ap.bandwidth.com/?utm_medium=social&utm_source=github&utm_campaign=dtolb&utm_content=_).
    This reference application makes creating, registering, and implementing voice calling for endpoints (mobile, web, or any SIP client) easy.
    This application implements the steps documented [here](http://ap.bandwidth.com/docs/how-to-guides/use-endpoints-make-receive-calls-sip-clients/).

You can open up the web page at the root of the deployed project for more instructions and for example of voice calling in your web browser using WebRTC.
Current browser supported: Chrome and Opera.

Uses the:
* [Catapult Node SDK](https://github.com/bandwidthcom/node-bandwidth)

## Prerequisites
- Configured Machine with Ngrok/Port Forwarding -OR- Heroku Account
  - [Ngrok](https://ngrok.com/)
  - [Heroku](https://www.heroku.com/)
- [Catapult Account](http://ap.bandwidth.com/?utm_medium=social&utm_source=github&utm_campaign=dtolb&utm_content=_)
- [Node 4.2+](https://nodejs.org/en/download/releases/)
- [MongoDb 2.2+](https://www.mongodb.org/downloads)

## Deploy To PaaS

#### Env Variables Required To Run
* ```CATAPULT_USER_ID```
* ```CATAPULT_API_TOKEN```
* ```CATAPULT_API_SECRET```
* ```CATAPULT_DOMAIN_NAME```

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Install
Before running export next environment variables :

```CATAPULT_DOMAIN_NAME``` - domain name (it will be created by the app if need),

```CATAPULT_USER_ID```, ```CATAPULT_API_TOKEN```, ```CATAPULT_API_TOKEN``` - auth data for Catapult API (to search and reserve a phone number, etc)


After that run `npm install`  to install dependencies.


You can run this demo  like `node index.js` on local machine if you have ability to handle external requests or use any external hosting.

## Deploy on Heroku

Create account on [Heroku](https://www.heroku.com/) and install [Heroku Toolbel](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up) if need.


Run `heroku create` to create new app on Heroku and link it with current project.

Run `heroku addons:create mongolab` to add mongodb support. 

Configure the app by commands

```
 heroku config:set CATAPULT_DOMAIN_NAME=your-domain
 heroku config:set CATAPULT_USER_ID=your-user-id
 heroku config:set CATAPULT_API_TOKEN=your-token
 heroku config:set CATAPULT_API_SECRET=your-secret
```

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

var express = require('express');
var ECT = require("ect");
var fs = require("fs");
var session = require("express-session");
var crypto = require("crypto");
var https = require("https");
var qs = require("qs");

//constants
var SESSION_SECRET = "shpapad";
var OAUTH_CLIENTID = "clientid";
var OAUTH_SECRET = "secret";

//environments
var app = express();
var ectRenderer = ECT({ watch: true, root: __dirname + '/views', ext : '.ect'});
app.set('view engine', 'ect');
app.engine("ect", ectRenderer.render);
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { maxAge: null, expires: false } }));

//assets
app.get("/index.css", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/index.css"); res.writeHead(200, {"Content-Type":"text/css"}); res.end(f, "utf-8"); });
app.get("/shpapad.js", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/shpapad.js"); res.writeHead(200, {"Content-Type":"text/javascript"}); res.end(f, "utf-8"); });
app.get("/siwg.png", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/siwg.png"); res.writeHead(200, {"Content-Type":"image/png"}); res.end(f); });

//routes
app.get("/", function(req, res) {
  if (req.session.user) {
    res.redirect(303, "/list");
  } else {
    res.redirect(303, "/login");
  }
});

app.get("/login", function(req, res) {
  if (req.session.user) {
    res.redirect(303, "/list");
  } else {
    req.session.oauthState = crypto.randomBytes(32).toString("hex");
    var oauthParameter = {
        client_id: OAUTH_CLIENTID
      , response_type: "code"
      , scope: "email"
      , redirect_uri: "http://shpapad.sevensenses.jp/oauth2callback"
      , state: req.session.oauthState
    };
    res.render("login", { menu: [], logoutable: false, oauth: oauthParameter });
  }
});

app.get("/oauth2callback", function(req, res) {
  if (req.session.user) {
    res.redirect(303, "/list");
  } else {

      //for CSRF
      if (req.query["state"]) {
          if (req.query["state"] === req.session.oauthState) {
            //state OK
          } else {
            res.redirect(303, "/login");
          }
      } else {
        res.redirect(303, "/login");
      }

      //get user information from google
      var parameters = qs.stringify({"code":req.query["code"], "client_id":OAUTH_CLIENTID, "client_secret":OAUTH_SECRET, "redirect_uri":"http://shpapad.sevensenses.jp/oauth2callback", "grant_type":"authorization_code"});
      var options = {hostname:"www.googleapis.com", port:443, path:"/oauth2/v3/token", method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}};

      console.log(req.query);
  }
});

app.get("/list", function(req, res) {
        if (req.session.user) {

        } else {
            res.render("index");
        }
    });

app.get("/task", function(req, res) {
        if (req.session.user) {

        } else {
            res.render("index");
        }
    });

app.listen(3000);

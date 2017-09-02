var express = require('express');
var ECT = require("ect");
var fs = require("fs");
var session = require("express-session");
var crypto = require("crypto");
var https = require("https");
var qs = require("querystring");
var levelup = require("levelup");
var bodyParser = require("body-parser");
var levelMultiply = require("level-multiply");
var sass = require("node-sass");

//constants
var SESSION_SECRET = process.env.SHPAPAD_SESSION_SECRET;
var OAUTH_CLIENTID = process.env.SHPAPAD_OAUTH_CLIENTID;
var OAUTH_SECRET = process.env.SHPAPAD_OAUTH_CLIENTSECRET;

//environments
var app = express();
var rawdb = levelup("./data/db/shpapad_db");
var db = levelMultiply(rawdb);
var ectRenderer = ECT({ watch: true, root: __dirname + '/views', ext : '.ect'});
app.set('view engine', 'ect');
app.engine("ect", ectRenderer.render);
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { maxAge: null, expires: false } }));
app.use(bodyParser.urlencoded({ extended: false }));

//assets
app.get("/index.css", function(req, res) {
  var f = sass.renderSync({file: __dirname + "/assets/index.css"});
  res.writeHead(200, {"Content-Type":"text/css"});
  res.end(f.css, "utf-8");
});
app.get("/superagent.js", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/superagent.js"); res.writeHead(200, {"Content-Type":"text/javascript"}); res.end(f, "utf-8"); });
app.get("/shpapad.js", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/shpapad.js"); res.writeHead(200, {"Content-Type":"text/javascript"}); res.end(f, "utf-8"); });
app.get("/siwg.png", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/siwg.png"); res.writeHead(200, {"Content-Type":"image/png"}); res.end(f); });
app.get("/logout.png", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/logout.png"); res.writeHead(200, {"Content-Type":"image/png"}); res.end(f); });
app.get("/shpapad-logo-w.png", function(req, res) { var f = fs.readFileSync(__dirname + "/assets/shpapad-logo-555.png"); res.writeHead(200, {"Content-Type":"image/png"}); res.end(f); });

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
      , scope: "openid"
      , redirect_uri: "https://shpapad.sevensenses.jp/oauth2callback"
      , state: req.session.oauthState
    };
    res.render("login", { menu: [], logoutable: false, oauth: oauthParameter });
  }
});

app.get("/logout", function(req, res) {
  req.session.destroy();
  res.redirect(303, "/login");
});

app.get("/oauth2callback", function(req, res) {
  if (req.session.user) {
    res.redirect(303, "/list");
  } else {

      //for CSRF
      if (req.query["state"] && req.query["code"]) {
          if (req.query["state"] === req.session.oauthState) {
            //state OK
          } else {
            res.redirect(303, "/login");
            return;
          }
      } else {
        res.redirect(303, "/login");
        return;
      }

      //get user information from google with OpenID-Connect
      var parameters = qs.stringify({"code":req.query["code"], "client_id":OAUTH_CLIENTID, "client_secret":OAUTH_SECRET, "redirect_uri":"https://shpapad.sevensenses.jp/oauth2callback", "grant_type":"authorization_code"});
      var options = {hostname:"accounts.google.com", port:443, path:"/o/oauth2/token", method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}};
      var request = https.request(options, function(response) {
        var d = "";
        response.on("data", function(chunk) {
          d += chunk;
        });
        response.on("end", function() {
          //parse id_token
          var rawjson = JSON.parse(d.toString());
          https.get("https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=" + rawjson["id_token"], function(vres) {
            vres.on("data", function(vd) {
              var userid = (JSON.parse(vd.toString()))["user_id"];
              var hashedID = crypto.createHash("sha256").update(userid).digest("hex");
              db.get(hashedID, function(err, value) {
                if (err) {
                  if (err.notFound) {
                    //create new user
                    db.put(hashedID, "", function(err) {
                      if (err) {
                        res.redirect(303, "/login");
                      } else {
                        //auth OK
                        req.session.user = userid;
                        res.redirect(303, "/list");
                      }
                    });
                  } else {
                    res.redirect(303, "/login");
                  }
                } else {
                  //auth OK
                  req.session.user = userid;
                  res.redirect(303, "/list");
                }
              });
            });
          });
        });
      });
      request.write(parameters);
      request.end();
  }
});

app.get("/list", function(req, res) {
  if (req.session.user) {
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");

    //get lists
    var lists = [];
    db.createReadStream({gt: hashedID + "!", lte: hashedID + "!9999999999999" })
      .on("data", function(data) {
        var obj = JSON.parse(data["value"]);
        lists.push({key:data["key"], name:obj["name"], count:obj["count"]});
      })
      .on("end", function(data) {
        res.render("list", { menu: [{href: "/list", value:"リスト"}], logoutable: true, lists: lists });
      });

  } else {
    res.redirect(303, "/login");
  }
});

app.post("/list", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.body.value) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //create list
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var hashedListKey = hashedID + "!" + (new Date()).getTime();
    var listValue = {name: req.body.value, count: 0};
    db.put(hashedListKey, JSON.stringify(listValue), function(err) {
      if (err) {
        res.send("add error! (1)");
      } else {
        res.json({"id":hashedListKey});
      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.put("/list", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.body.value && req.query.id) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //update list name
    db.get(req.query.id, function(err, list) {
      if (err) {
        res.send("update list error! (2)");
      } else {
        var listobj = JSON.parse(list);
        var updated = {name:req.body.value, count:listobj["count"]};
        db.put(req.query.id, JSON.stringify(updated), function(err) {
          if (err) {
            res.send("update list error! (2)");
          } else {
            res.end();
          }
        });
      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.delete("/list", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.query.id) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //parameter validation (owner?)
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var parameterID = (req.query.id).substring(0, req.query.id.indexOf("!"));
    if (hashedID !== parameterID) {
      res.status(403);
      res.end();
      return;
    }

    //delete list
    db.del(req.query.id, function(err) {
      if (err) {
        res.send("delete error! (1)");
      } else {
        res.end();
      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.get("/task", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.query.l) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //parameter validation (owner?)
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var parameterID = (req.query.l).substring(0, req.query.l.indexOf("!"));
    if (hashedID !== parameterID) {
      res.status(403);
      res.end();
      return;
    }

    //get list name
    db.get(req.query.l, function(err, list) {
      if (err) {
        res.send("add error! (2)");
      } else {
        var listobj = JSON.parse(list);

        //get tasks
        var tkey = crypto.createHash("sha256").update(req.query.l).digest("hex");
        var tasks = [];
        db.createReadStream({gt: tkey + "!", lte: tkey + "!9999999999999" })
          .on("data", function(data) {
            tasks.push(data);
          })
          .on("end", function(data) {
            res.render("task", { menu: [{href: "/list", value:"リスト"}, {href: "/task?l=" + req.query.l, value: listobj.name}], logoutable: true, tasks: tasks });
          });
      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.post("/task", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.body.value) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //parameter validation (owner?)
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var parameterID = (req.query.l).substring(0, req.query.l.indexOf("!"));
    if (hashedID !== parameterID) {
      res.status(403);
      res.end();
      return;
    }

    //create task
    var key = crypto.createHash("sha256").update(req.query.l).digest("hex") + "!" +  (new Date()).getTime();
    db.put(key, req.body.value, function(err) {
      if (err) {
        res.send("create task error! (1)");
      } else {

        //update task count
        db.get(req.query.l, function(err, list) {
          if (err) {
            res.send("create task error! (2)");
          } else {
            var listobj = JSON.parse(list);
            var updated = {name:listobj["name"], count:listobj["count"]+1};
            db.put(req.query.l, JSON.stringify(updated), function(err) {
              if (err) {
                res.send("create task error! (2)");
              } else {
                res.json({"id":key});
              }
            });
          }
        });

      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

//update task value (requires query.id/query.l/body.value)
app.put("/task", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.body.value) {
    } else {
      res.status(400);
      res.end();
      return;
    }
    if (req.query.id) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //parameter validation (owner?)
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var parameterID = (req.query.l).substring(0, req.query.l.indexOf("!"));
    if (hashedID !== parameterID) {
      res.status(403);
      res.end();
      return;
    }

    //update task
    db.put(req.query.id, req.body.value, function(err) {
      if (err) res.send("update task error!");
      res.end();
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.delete("/task", function(req, res) {
  if (req.session.user) {

    //parameter existence
    if (req.query.id) {
    } else {
      res.status(400);
      res.end();
      return;
    }

    //parameter validation (owner?)
    var hashedID = crypto.createHash("sha256").update(req.session.user).digest("hex");
    var parameterID = (req.query.l).substring(0, req.query.l.indexOf("!"));
    if (hashedID !== parameterID) {
      res.status(403);
      res.end();
      return;
    }

    //delete task
    db.del(req.query.id, function(err) {
      if (err) {
        res.send("delete error! (1)");
      } else {

        //update task count
        db.get(req.query.l, function(err, list) {
          if (err) {
            res.send("create task error! (2)");
          } else {
            var listobj = JSON.parse(list);
            var updated = {name:listobj["name"], count:listobj["count"]-1};
            db.put(req.query.l, JSON.stringify(updated), function(err) {
              if (err) {
                res.send("create task error! (2)");
              } else {
                res.end();
              }
            });
          }
        });

        res.end();
      }
    });

  } else {
    res.redirect(303, "/logout");
  }
});

app.listen(3000);

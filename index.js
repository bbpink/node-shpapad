var express = require('express');
var ECT = require("ect");
var fs = require("fs");

//environments
var app = express();
var ectRenderer = ECT({ watch: true, root: __dirname + '/views', ext : '.ect'});
app.set('view engine', 'ect');
app.engine("ect", ectRenderer.render);

//assets
app.get("/index.css", function(req, res) {
  var f = fs.readFileSync(__dirname + "/assets/index.css");
  res.writeHead(200, {"Content-Type":"text/css"});
  res.end(f, "utf-8");
});
app.get("/index.js", function(req, res) {
  var f = fs.readFileSync(__dirname + "/assets/index.js");
  res.writeHead(200, {"Content-Type":"text/javascript"});
  res.end(f, "utf-8");
});

app.get("/", function(req, res) {
  res.render("index");
});

app.listen(3000);

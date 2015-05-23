var express = require('express');
var app = express();

app.get("/", function(req, res) {
  console.log("kitayo");
  res.send("hey");
});

app.listen(3000);

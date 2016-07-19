'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const routes = require('./api/routes');

const ENV = process.env.NODE_ENV || config.environment;
const PORT = process.env.NODE_PORT || config.port;

var app = express();
app.use(bodyParser.json()); // for parsing application/json

//CORS configuration
//TODO: specify domains permissible
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//setup routes
routes.setup(app);

//run server
let server = app.listen(PORT, () => {
  let host = server.address().address;
  let port = server.address().port;
  console.log('Token Master API server running @ => ', host, port);
});
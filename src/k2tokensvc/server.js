//  TODO: implement 405 (Method Not Allowed) for all routes not implemted..


//**** IMPORTS *******
var express = require('express');
var bodyParser = require('body-parser');

//Setup Express
const app = express();

//Setup EJS as the view engine
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended : true })); //Parse Body into objects

//setup static folder for things like images, etc.
app.use(express.static(__dirname + '/public'));

//setup routes and pass in app and resolver contexts..
require('./routes')(app, {});

//START SERVER on 8080 for local..
const server = app.listen(8080, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(`Listening at http://${host}:${port}`);
});
// routes/index.js

//addd routes handles for all the route groups

//token service routes handler route group
const api_usertoken = require('./api_usertoken');

//AAD Login and Token Exchange routes handler route group
const web_register = require('./web_register');

//export to init all route groups
module.exports = function(app, resolver) 
{

    //start user token services routes handler
    //only pass in pass in app context, could pass others..
    api_usertoken(app, resolver);
    
    //Routes for Registration and AAD Topken Exchange
    //only pass in pass in app context, could pass others..
    web_register(app, resolver);

    // ..Add more route groups below..

};

/*
app.get('/:id', function (req, res) {
   // First read existing users.
   fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
      var users = JSON.parse( data );
      var user = users["user" + req.params.id] 
      console.log( user );
      res.end( JSON.stringify(user));
   });
})
*/
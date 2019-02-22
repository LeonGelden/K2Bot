
var resolver = require('../resolver');

//handle all routes for Web Regisration
module.exports = function(app) 
{
    //USER REGISTRATION / LOGIN
    app.get('/', function(req, res) 
    {  
        res.render('register', {});
    });

    //USER REGISTRATION / LOGIN
    app.get('/register', function(req, res) 
    {  
        res.render('register', {});
    });

    app.post('/register', function(req, res) 
    {  
        var regkey = req.body.regkey;
        if (!regkey)
        {
            res.render('error', {err: 'INVALID KEY' });
        }
        else
        {
            //Get App info
            regkey = regkey.toUpperCase();
            resolver.resolveAppByRegkey(regkey)
                    .then( function(app_obj)
            {
                //build up AAD OAUTH Login URL for this App..
                var redir_url = 'https://login.microsoftonline.com/common/oauth2/authorize';
                    redir_url += '?client_id=' + app_obj.aad_app_id;
                    redir_url += '&response_type=code';
                    redir_url += '&redirect_uri=' + app_obj.aad_app_redirecturi;
                    redir_url += '&response_mode=form_post';
                    redir_url += '&prompt=login'; //Force a Login..
                    redir_url += '&state=' + regkey;                

                res.redirect(redir_url);
            })
            .catch( function (err)
            {
                //generic error.. TODO: prettify error..
                res.render('error', {err: err});
//                res.status(500).json(err);
            });           
        }
        
    });
    
    app.post('/token', function(req, res) 
    {  
        var regkey = req.body.state;
        var auth_code = req.body.code;
        
        if (!regkey && !auth_code)
        {
            res.render('error', {});
        }
        else
        {
            //Get App info
            resolver.registerUserToken(auth_code, regkey)
            .then( function(ret_obj)
            {                
                res.render('thankyou', {jwt: ret_obj.data_obj});

            })
            .catch( function (err)
            {
                //generic error.. TODO: prettify error..
                res.render('error', {err: err});
                //res.status(500).json(err);
            });  
            
        }
        
    });    

};

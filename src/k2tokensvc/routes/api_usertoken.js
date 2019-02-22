
var guid = require('guid');
var resolver = require('../resolver');

//generic error object
function buildErrObj(err, error_area)
{
     var errobj = undefined;

        //if no http_response defined, its a general exceptiomm
        if (err.http_response == undefined)
        { 
            var error_ref = guid.raw(); //generate guid for error referencing..
            err.reference = error_ref;
            err.error_area = error_area;
            console.log(err);
            
            errobj = {Message: 'Internal Error', http_response: 500, error_area: 1001, error_ref: error_ref};
        } 
        else 
        {
            errobj = err;
        }
    
    return errobj;
}


//handle all routes for tokenservice api's in this route group handler..
module.exports = function(app) 
{
    
    //USER REGISTRATION KEY REQUEST [ POST ]
    app.post('/api/tokenservice/preview/regkey', function(req, res) 
    {   
       //API Key Supplied in header..
        var apikey = req.get('X-K2-API-Key');
        
        //Get bearer token
        resolver.genRegKey(apikey, req.body.user_id)
            .then( function(ret_obj)
            {
                var http_response = ret_obj.http_response;
                var res_obj = ret_obj;
            
                if (http_response == 401) //for 401 errors, must supply WWW-Authenticate header..
                    res.setHeader('WWW-Authenticate', 'Newauth realm="Not-Authorized"');
                else if (http_response == 200) //for 200, success, extract only the data obj.
                    res_obj = ret_obj.data_obj; 

                //send response..            
                res.status(http_response).json(res_obj);

            })
            .catch( function (err)
            {
                var errobj = buildErrObj(err,  1002);
                res.status(errobj.http_response).json(errobj);
            });

    });
    
    
    //USER TOKEN REQUEST [ POST ]
    app.post('/api/tokenservice/preview/usertoken', function(req, res) 
    {        
        //API Key Supplied in header..
        var apikey = req.get('X-K2-API-Key');
        
        //Get bearer token
        resolver.resolveBearerTokenOnly(apikey, req.body.user_id)
            .then( function(ret_obj)
            {
                var http_response = ret_obj.http_response;
                var res_obj = ret_obj;
            
                //for 401 errors, must supply WWW-Authenticate header..
                if (http_response == 401)
                    res.setHeader('WWW-Authenticate', 'Newauth realm="Not-Authorized"');
                else if (http_response == 200)
                    res_obj = ret_obj.data_obj; //success, use the actual data object..

    
                //send response..            
                res.status(http_response).json(res_obj);
            })
            .catch( function (err)
            {
                var errobj = buildErrObj(err, 1003);
                res.status(errobj.http_response).json(errobj);
            });

    });

};




            
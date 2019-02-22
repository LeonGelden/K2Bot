//General imports
var guid = require('guid');
var https = require('https');
var querystring = require('querystring');
var shajs = require('sha.js');
var jwt_decode = require('jwt-decode');
var rndkey = require('randomatic');
/* RANDOMATIC
a: Lowercase alpha characters (abcdefghijklmnopqrstuvwxyz')
A: Uppercase alpha characters (ABCDEFGHIJKLMNOPQRSTUVWXYZ')
0: Numeric characters (0123456789')
!: Special characters (~!@#$%^&()_+-={}[];\',.)
*: All characters (all of the above combined)
?: Custom characters (pass a string of custom characters to the options)
*/


//**** DATA STORE IMPORTS AND CONFIGS *******
// Imports the Google Cloud client library
const Datastore = require('@google-cloud/datastore');
const cfg = require('./config.json');

//AES256 ENCRYPTION OBJ
var aes256 = require('aes256');
var aes_key = cfg.datastore_key;
var aes_cipher = aes256.createCipher(aes_key);

const msin5min = 300000;
const msin30min = 3600000;
const msindays = 86400000;
const msin7days = 604800000;
const msin365days = 31536000000;


// Your Google Cloud Platform project ID
const projectId = cfg.google_projectid;

// Instantiates a client ** Provisioned to Google Cloud **
const datastore = Datastore({ projectId: projectId });

//** Other than Google Cloud, include keyfile **
//const datastore = Datastore({ projectId: projectId, keyFilename: cfg.google_keyfile });


// The Cloud Datastore key for the new entry - Using AAD app_id
const ext_app_apikey_kind = 'ext_app_apikey'; //storage kind (table) for api keys
const ext_app_kind = 'ext_app'; // apps registrations
const ext_app_user_kind = 'ext_app_user'; //user registrations per app
const ext_app_user_token_kind = 'ext_app_user_token'; //user registrations per app
const ext_app_user_regkey_kind = 'ext_app_user_regkey'; //new temp reg keys

//**** END DATA STORE IMPORTS AND CONFIGS *******


//UTIL FUNCTIONS

const error_codes = {
    general_error: 'general_error',
    missing_parameters: 'missing_parameters',
    not_found: 'not_found',
    invalid_apikey: 'invalid_apikey',
    invalid_token: 'invalid_token',
    grant_failed: 'grant_failed',
    expired: 'expired'

};

const grant_types = {
    authorization_code: 'authorization_code',
    refresh_token: 'refresh_token'
};

// MS AAD Well known Token endpoints.
//https://login.microsoftonline.com/common/.well-known/openid-configuration

// ******** AQUIRE OR REFRESH USER TOKEN *******
const getAuthToken = function (grant_code, grant_type, ext_app) {
    console.log('function getAuthToken(' + grant_code + ',' + grant_type +',' + ext_app + ')');

    //promise to returm resolve or reject objects.. consumer will do a .then and .catch
    return new Promise(function (resolve, reject) {
        try {
            var req_body = {
                client_id: ext_app.aad_app_id,
                grant_type: grant_type, // must be authorization_code or refresh_token
                //                code: 'undefined', //TBD further down
                //                refresh_token: undefined, //TBD further down
                redirect_uri: ext_app.aad_app_redirecturi,
                client_secret: ext_app.aad_app_secret,
                resource: ext_app.aad_app_resource
            };

            //Set request params for code or refresh tokens based on grant_type requested
            if (req_body.grant_type == grant_types.authorization_code)
                req_body.code = grant_code;
            else
                req_body.refresh_token = grant_code;

            //generate www-form-urlencoded body 
            var content_body = querystring.stringify(req_body);

            //HTTP Connection options
            var http_options = {
                hostname: cfg.idp_hostname,
                port: 443,
                path: '/common/oauth2/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': content_body.length
                } //requires content length, else will be chunked..
            };

            //Create the Request
            var http_req = https.request(http_options, function (http_res) {
                http_res.setEncoding('utf8');

                var res_body = '';

                http_res.on('data', function (res_chunk) {
                    res_body += res_chunk; //collect all the data in chunks..
                });

                http_res.on('end', function () {
                    //response 200 is good, everything else is failure..
                    if (http_res.statusCode == 200) {
                        var tokenobj = JSON.parse(res_body);
                        resolve(tokenobj);
                    }
                    else {
                        var response = 'Request Failed ' + res_body;
                        reject({ Message: response, http_response: http_res.statusCode, error_area: 403, error_code: error_codes.grant_failed });
                    }
                });

                http_res.on('error', function (err) {
                    var response = 'Request Failed ' + err;
                    reject({ Message: response, http_response: http_res.statusCode, error_area: 402, error_code: error_codes.grant_failed });
                });


            }); //end https request

            //On error making request..
            http_req.on('error', function (err) {
                //If Error, LOG REASON and Add reference..
                var error_ref = guid.raw(); //generate guid for error referencing..
                err.reference = error_ref;
                console.log(err);
                //ERROR makign request - See log files..
                reject({ Message: 'Internal Error', http_response: 500, error_area: 401, error_code: error_codes.general_error, error_ref: error_ref });
            });

            //Write www-form-urlencoded body 
            http_req.write(content_body);

            //complete the write and send request
            http_req.end();
        }
        catch (err) {
            reject(err);
        }
    });
}

// ********  RESOLVE API KEY TO APPID ********
const resolveAPIKey = function (apikey) {
    console.log('function resolveAPIKey(' + apikey + ')');

    //promise to returm resolve or reject objects.. consumer will do a .then and .catch
    return new Promise(function (resolve, reject) {
        //If API Key was supplied properly, try to find it in the Google DataStore
        if (apikey) {
            //API Key is stored with api-key value as the row key
            var itemkey = datastore.key([ext_app_apikey_kind, apikey]);

            datastore.get(itemkey, function (err, apikey_entry) {
                //Check if Key was retreived from Storage..
                if (apikey_entry) {
                    //Check for Key Expiration
                    if (apikey_entry.expires > Date.now()) {
                        resolve(apikey_entry);
                    }
                    else {
                        //EXPIRED!
                        reject({ Message: 'Not Authorized', http_response: 401, error_area: 104, error_code: error_codes.invalid_apikey });
                    }
                }
                else {
                    //Key Not Found                    
                    if (err) {
                        //If Error, LOG REASON and Add reference..
                        var error_ref = guid.raw(); //generate guid for error referencing..
                        err.reference = error_ref;
                        console.log(err);
                        //ERROR getting data - See log files..
                        reject({ Message: 'Internal Error', http_response: 500, error_area: 103, error_code: error_codes.general_error, error_ref: error_ref });
                    }
                    else {
                        //API KEY NOT FOUND IN STORAGE!
                        reject({ Message: 'Not Authorized', http_response: 401, error_area: 102, error_code: error_codes.not_found });
                    }
                }
            });
        }
        else {
            //API KEY NOT PROVIDED!
            reject({ Message: 'Not Authorized', http_response: 401, error_area: 101, error_code: error_codes.missing_parameters });
        }

    }); //end of promise
};

// ********  RESOLVE APP ID TO APP REGISTRATION ********
const resolveApp = function (appid) {
    console.log('function resolveApp(' + appid + ')');

    //promise to returm resolve or reject objects.. consumer will do a .then and .catch
    return new Promise(function (resolve, reject) {
        //If API Key was supplied properly, try to find it in the Google DataStore
        if (appid) {
            //API Key is stored with api-key value as the row key
            var itemkey = datastore.key([ext_app_kind, appid]);

            console.log('appid: ' + appid);

            datastore.get(itemkey, function (err, app_entry) {
                if (app_entry) {
                    //TODO: Check App enabled..

                    //inline decrypt app secret..
                    app_entry.aad_app_secret = aes_cipher.decrypt(app_entry.aad_app_secret)

                    resolve(app_entry);
                }
                else {
                    if (err) {
                        //ERROR - Log reason with reference
                        var error_ref = guid.raw(); //generate guid for error referencing..
                        err.reference = error_ref;
                        console.log(err);

                        //ERROR getting data - See log files..
                        reject({ Message: 'Internal Error', http_response: 500, error_area: 203, error_code: error_codes.general_error, error_ref: error_ref });
                    }
                    else {
                        //APP ID Not Found in Storage..
                        reject({ Message: 'Invalid App ID', http_response: 400, error_area: 202, error_code: error_codes.not_found });
                    }
                }
            });

        }
        else {
            //APP ID NOT PROVIDED!
            reject({ Message: 'Invalid App ID', http_response: 400, error_area: 201, error_code: error_codes.missing_parameters });
        }

    }); //end of promise
};

// ********  RESOLVE USER REGISTRATION ********
const resolveUserToken = function (app_user_id, ext_app) {
    console.log('function resolveUserToken(' + app_user_id + ',' + ext_app + ')');

    //MUST REQUEST AN API KEY FOR EXTERNAL APP
    var ext_app_apikey = {
        apikey: '0372ff28-9a79-4aed-818d-a8401c57b864',
        aad_app_id: '983c98d5-69a5-4f5a-ac79-06fac4abc6b3',
        expires: Date.now() + msin365days //1 year expiration for ext app..
    };

    // The Cloud Datastore key for the new entry - Using AAD app_id
    const ext_app_apikey_kind = 'ext_app_apikey';
    const ext_app_apikey_keyfield = datastore.key([ext_app_apikey_kind, ext_app_apikey.apikey]);

    // Prepares the new entry
    const ext_app_apikey_entry = {
        key: ext_app_apikey_keyfield,
        data: ext_app_apikey
    };

    // Saves the entity (new will insert, existing will update)
    datastore.save(ext_app_apikey_entry, function (err) {
        if (!err) {
            console.log('Created App API KEY: ' + ext_app_apikey.apikey);
        }
        else {
            console.log('Error: ' + err);
        }
    });

    //promise to returm resolve or reject objects.. consumer will do a .then and .catch
    return new Promise(function (resolve, reject) {
        try {
            
            //If API Key was supplied properly, try to find it in the Google DataStore
            if (app_user_id) {
                console.log('1. app_user_id: ' + app_user_id);
                //API Key is stored with api-key value as the row key
                var user_key = datastore.key([ext_app_user_kind, app_user_id]);

                datastore.get(user_key, function (err, user_entry) {
                    //make sure valid entry from Store retreived..
                    if (user_entry) {
                        // Valid user, now get Token for this ext user based on his aad appid+upn
                        var token_itemkey = datastore.key([ext_app_user_token_kind, user_entry.ext_app_user_token_id]);
                        datastore.get(token_itemkey, function (err, user_token_entry) {
                            //check if token retrieved..
                            if (user_token_entry) {
                                var token_valid = true;

                                //make sure token is not expired and not revoked
                                if ((user_token_entry.expires < Date.now()) || (user_token_entry.not_revoked == false)) {
                                    //Expired.. Do refresh!
                                    console.log('Token Cache Miss: ' + user_token_entry.ext_app_user_token_id);

                                    //inline decrypt refresh_token..
                                    user_token_entry.refresh_token = aes_cipher.decrypt(user_token_entry.refresh_token)

                                    //Get a Refresh Token..
                                    getAuthToken(user_token_entry.refresh_token, grant_types.refresh_token, ext_app)
                                        .then(function (res_token) {
                                            //update expiry date/time & revoked status
                                            user_token_entry.expires = Date.now() + (parseInt(res_token.expires_in) * 1000);
                                            user_token_entry.not_revoked = true;

                                            //return existing vali token
                                            var resolved_token = {
                                                access_token: res_token.access_token,
                                                expires: user_token_entry.expires
                                            };

                                            //re-encrypt and update data store..
                                            user_token_entry.refresh_token = aes_cipher.encrypt(res_token.refresh_token);
                                            user_token_entry.access_token = aes_cipher.encrypt(res_token.access_token);

                                            // Prepares the entry
                                            const updated_user_token_entry = {
                                                key: token_itemkey,
                                                data: user_token_entry,
                                                excludeFromIndexes: ['access_token', 'refresh_token', 'id_token'] //1500 byte limit on auto indexed fields.
                                            };

                                            //Async save data..
                                            datastore.save(updated_user_token_entry, function (err) {
                                                if (!err) {
                                                    console.log('Token Cache Update: ' + user_token_entry.ext_app_user_token_id);

                                                }
                                                else {
                                                    console.log('Token Cache Error: ' + ext_app_user_id + ', Info: ' + err);
                                                }
                                            });

                                            //return the user token.
                                            resolve(resolved_token);
                                        })
                                        .catch(function (err) {
                                            //Error refreshing token..
                                            reject(err);
                                        });

                                }
                                else if (user_token_entry.not_revoked) {
                                    console.log('Token Cache Hit: ' + user_token_entry.ext_app_user_id + ' ' + new Date(user_token_entry.expires));

                                    //return existing vali token
                                    var resolved_token = {
                                        access_token: aes_cipher.decrypt(user_token_entry.access_token),
                                        expires: user_token_entry.expires
                                    };

                                    resolve(resolved_token);
                                }
                                else {
                                    reject({ Message: 'Invalid Token', http_response: 400, error_area: 306, error_code: error_codes.invalid_token });
                                }
                            }
                            else {
                                if (err) {
                                    //ERROR - Log reason with reference

                                    var error_ref = guid.raw(); //generate guid for error referencing..
                                    err.reference = error_ref;
                                    console.log(err);

                                    //ERROR getting data - See log files..
                                    reject({ Message: 'Internal Error', http_response: 500, error_area: 305, error_code: error_codes.general_error, error_ref: error_ref });
                                }
                                else {
                                    //USER ID Not Found in Storage.. Registration required
                                    reject({ Message: 'Invalid Token', http_response: 400, error_area: 304, error_code: error_codes.not_found });
                                }
                            }
                        });
                    }
                    else {
                        if (err) {
                            //ERROR - Log reason with reference
                            var error_ref = guid.raw(); //generate guid for error referencing..
                            err.reference = error_ref;
                            console.log(err);
                            //ERROR getting data - See log files..
                            reject({ Message: 'Internal Error', http_response: 500, error_area: 303, error_code: error_codes.general_error, error_ref: error_ref });
                        }
                        else {
                            //USER ID Not Found in Storage.. Registration required
                            console.log("User Not Found - user id: " + app_user_id + "datastore: " + JSON.stringify(datastore));

                            reject({ Message: 'Invalid User', http_response: 400, error_area: 302, error_code: error_codes.not_found });
                        }
                    }

                }); // END get datastore USER Obj. 
            }
            else {
                //USER ID NOT PROVIDED!
                reject({ Message: 'Invalid User', http_response: 400, error_area: 301, error_code: error_codes.missing_parameters });
            }
        }
        catch (err) {
            reject(err);
        }
    }); //end of promise
};


// ********  RESOLVE REG KEY TO USERID ********
async function findRegKey(regkey) {
    console.log('function findRegKey(' + regkey + ')');

    var regkey_obj = undefined;

    if (regkey) {
        //REG Key is stored as the row key
        var itemkey = datastore.key([ext_app_user_regkey_kind, regkey]);

        regkey_obj = await datastore.get(itemkey);

        if ((regkey_obj != undefined) && (regkey_obj.length > 0)) {
            regkey_obj = regkey_obj[0];

            console.log('DataStore Bug hit..');
        }
    }

    return regkey_obj;
};


// ******** GET THE BEARER TOKEN FROM STORAGE - WITH AUTO REFRESH ******
async function resolveBearerTokenOnly(apikey, userid) {
    console.log('function resolveBearerTokenOnly(' + apikey + ',' + userid + ')');

    var ext_app_apikey = await resolver.resolveAPIKey(apikey);
    var ext_app = await resolver.resolveApp(ext_app_apikey.aad_app_id);

    //Construct UserID by SHA256(AppID-user_id)
    var app_user_id = shajs('sha256').update(ext_app_apikey.aad_app_id + '-' + userid).digest('hex');

    //Get User's token
    var ext_app_user_token = await resolver.resolveUserToken(app_user_id, ext_app);

    //return obj
    var ret_obj = {
        http_response: 200,
        data_obj: ext_app_user_token
    };

    return ret_obj;
}


// ********  GENERATE NEW REG KEY FOR USERID ********
async function genRegKey(apikey, userid) {
    console.log('function genRegKey(' + apikey + ',' + userid + ')');

    //return obj
    var ret_obj = {
        http_response: 500,
        data_obj: { Message: 'Internal Error', http_response: 500, error_area: 501, error_code: error_codes.general_error }
    };

    if (userid != undefined) {
        //resolve keys & user
        var ext_app_apikey = await resolver.resolveAPIKey(apikey); //Resolve API KEY
        var ext_app = await resolver.resolveApp(ext_app_apikey.aad_app_id); //Resolve App Info

        var app_user_id = shajs('sha256').update(ext_app_apikey.aad_app_id + '-' + userid).digest('hex');

        //Generate random alpha numeric key for user device/source registration
        var regkey = rndkey('A', 4);

        //make sure regkey doesnt exist yet and is exppired for longer than X days before re-use
        //construct registration key..
        var regkey_isgood = false;
        var retry_count = 10;
        while ((!regkey_isgood) && (retry_count > 0)) {
            var tmpobj = await findRegKey(regkey);

            if ((tmpobj == undefined) || (tmpobj.expires < Date.now() - msin7days)) {
                regkey_isgood = true;
            }
            else {   // already found and not expired for longer than X days, try another.. 
                regkey = rndkey('A0', 4);
                retry_count--;
            }
        }

        if (regkey_isgood) {
            //regkey is good!
            var ext_app_user_regkey = {
                regkey: regkey,
                aad_app_id: ext_app_apikey.aad_app_id,
                expires: Date.now() + msin5min, //only valid for 5 minutes
                ext_user_id: app_user_id
            };

            //REG Key is stored as the row key
            var itemkey = datastore.key([ext_app_user_regkey_kind, regkey]);

            // Prepares the new entry
            const ext_app_user_regkey_entry = {
                key: itemkey,
                data: ext_app_user_regkey
                //    excludeFromIndexes: ['xxxx']
            };

            // Saves the new regkey
            await datastore.save(ext_app_user_regkey_entry);


            //return obj with REGKEY and Login URL to enter RegKey
            var expires_in = msin5min / 5 / 1000; //seconds till expire..
            ret_obj.http_response = 200;
            ret_obj.data_obj = { regkey: regkey, expires_in: expires_in, login_url: ext_app.ext_app_login_url };
        }
    }
    else {
        ret_obj.http_response = 400;
        ret_obj.data_obj = { Message: 'Invalid User', http_response: 400, error_area: 502, error_code: error_codes.missing_parameters };
    }

    return ret_obj;
}


// ********  RESOLVE APP INFO BY REG-KEY ********
async function resolveAppByRegkey(regkey) {
    console.log('function resolveAppByRegkey(' + regkey + ')');

    var ret_app = undefined;
    var regkey_obj = await findRegKey(regkey);

    //make sure reg key is valid
    if ((regkey_obj != undefined) && (regkey_obj.expires > Date.now())) {
        ret_app = await resolveApp(regkey_obj.aad_app_id);
    }
    else {
        throw ('INVALID KEY');
    }

    return ret_app;
}


// ********  CREATE / UPDATE  USER TOKENS ********
async function registerUserToken(auth_code, regkey) {
    console.log('function registerUserToken(' + auth_code + ',' + regkey + ')');

    //return obj
    var ret_obj = {
        http_response: 500,
        data_obj: { Message: 'Internal Error', http_response: 500, error_area: 501, error_code: error_codes.general_error }
    };

    //Get regkey details
    var regkey_obj = await findRegKey(regkey);

    //make sure reg key is valid
    if ((regkey_obj != undefined) || (regkey_obj.expires > Date.now())) {
        //get app details
        var ext_app = await resolveApp(regkey_obj.aad_app_id);

        var oauth_token = await getAuthToken(auth_code, grant_types.authorization_code, ext_app);

        //crack JWT token
        var jwt_token = jwt_decode(oauth_token.id_token);

        //External User Obj
        var ext_app_user = {
            ext_app_user_id: regkey_obj.ext_user_id,  //external userid is app id + source + uniqueuser from Google DialogFlow.
            ext_app_user_token_id: shajs('sha256').update(ext_app.aad_app_id + '-' + jwt_token.upn).digest('hex'), //SHA256 of AAD APP ID + UPN  (incase we have the same UPN but for different app)
            not_revoked: true
        };

        //prepares entry key
        const ext_app_user_keyfield = datastore.key([ext_app_user_kind, ext_app_user.ext_app_user_id]);

        // Prepares the new user entry
        const ext_app_user_entry = {
            key: ext_app_user_keyfield,
            data: ext_app_user
        };

        // Saves the new user token
        await datastore.save(ext_app_user_entry);

        //AAD Token for external user.. one token per aad app for this upn
        var ext_app_user_token = {
            ext_app_user_token_id: ext_app_user.ext_app_user_token_id,
            aad_app_id: regkey_obj.aad_app_id,
            access_token: aes_cipher.encrypt(oauth_token.access_token),
            expires: Date.now() + (parseInt(oauth_token.expires_in) * 1000),
            refresh_token: aes_cipher.encrypt(oauth_token.refresh_token),
            id_token: aes_cipher.encrypt(oauth_token.id_token),
            not_revoked: true
        };

        console.log('ext_app_user_token: '+ JSON.stringify(ext_app_user_token));

        // Prepares the token entry
        const ext_app_user_token_itemkey = datastore.key([ext_app_user_token_kind, ext_app_user_token.ext_app_user_token_id]);

        var user_token_entry = {
            key: ext_app_user_token_itemkey,
            data: ext_app_user_token,
            excludeFromIndexes: ['access_token', 'refresh_token', 'id_token'] //1500 byte limit on auto indexed fields.
        };

        // Saves the new user token
        await datastore.save(user_token_entry);

        ret_obj.http_response = 200;
        ret_obj.data_obj = jwt_token;
    }

    return ret_obj;
}

//Construct generic Resolver object to export  
module.exports = resolver = {
    grant_types: grant_types,
    error_codes: error_codes,
    resolveAPIKey: resolveAPIKey,
    resolveApp: resolveApp,
    resolveUserToken: resolveUserToken,
    findRegKey: findRegKey,
    resolveBearerTokenOnly: resolveBearerTokenOnly,
    genRegKey: genRegKey,
    resolveAppByRegkey: resolveAppByRegkey,
    registerUserToken: registerUserToken
};

// Imports the Google Cloud client library
const Datastore = require('@google-cloud/datastore');
const cfg = require('./config.json');

//AES256 ENCRYPTION OBJ
var aes256 = require('aes256'); 
var aes_key = cfg.datastore_key;
var aes_cipher = aes256.createCipher(aes_key);

//Milli seconds per day
const msin5min = 300000;
const msin30min = 3600000;
const msindays = 86400000;
const msin7days = 604800000;
const msin365days = 31536000000;


// Your Google Cloud Platform project ID
const projectId = cfg.google_projectid;

// Instantiates a client ** Google Cloud use **
//const datastore = Datastore({ projectId: projectId });
//** Other than Google Cloud, include keyfile **
const datastore = Datastore({ projectId: projectId, keyFilename: cfg.google_keyfile });

//MUST REGISTER EXTERNAL APP FIRST (BASED ON AAD APP / TENANCY)
var ext_app = {
        ext_app_name: 'Alfred-G',
        aad_app_id: '983c98d5-69a5-4f5a-ac79-06fac4abc6b3', //AAD App Id / Client ID for new App..
        aad_app_secret: aes_cipher.encrypt('F+0S8jjlaS/BewX5OqSgYr+iWv3ZKtCIiB3bs+iBJ7M='), //AAD Permissions Key/Secret - Encrypted before save!!
        aad_app_resource: 'https://api.k2.com/',
        aad_app_redirecturi: 'https://alfred-g.appspot.com/token',
        aad_tenant_id: '272a6133-955c-4277-a03a-a2cb13407a62', //CUSTOMER Tenant ID..
        k2wfapi_url: 'https://k2klowd.onk2qa.com/Api/Workflow/preview',
        ext_app_enabled: true,
        ext_app_login_url: 'https://alfred-g.appspot.com/' //URL for where to login to resolve REG-KEY
};

// The Cloud Datastore key for the new entry - Using AAD app_id
const ext_app_kind = 'ext_app';
const ext_app_keyfield = datastore.key([ext_app_kind, ext_app.aad_app_id]);

// Prepares the new entry
const ext_app_entry = {
  key: ext_app_keyfield,
  data: ext_app
};

// Saves the entity (new will insert, existing will update)
datastore.save(ext_app_entry, function(err)
{
    if (!err)
    {
        console.log('Created App Registration: ' + ext_app.ext_app_name );

    }
    else
    {
        console.log('Error: ' + err);
    }
});

//******  GENERATE API KEY ******//

//MUST REQUEST AN API KEY FOR EXTERNAL APP
var ext_app_apikey = {
    apikey: '0372ff28-9a79-4aed-818d-a8401c57b864',
    aad_app_id: ext_app.aad_app_id,
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
datastore.save(ext_app_apikey_entry, function(err)
{
    if (!err)
    {
        console.log('Created App API KEY: ' + ext_app_apikey.apikey);
    }
    else
    {
        console.log('Error: ' + err);
    }
});



// *******   REGISTER USER ********

var shajs = require('sha.js');

var ext_app_user = {
    // ** USE SHA256 OF APPID-SOURCE-USER COMBO    
    ext_app_user_id: shajs('sha256').update(ext_app.aad_app_id + '-google-AP8TWv4cNOGzClCY8PS8d7cK97jO').digest('hex'),  //external userid is app id + source + uniqueuser from Google DialogFlow.
    ext_app_user_token_id: shajs('sha256').update(ext_app.aad_app_id + '-koos@k2cloudprev02.onmicrosoft.com').digest('hex'), //SHA256 of AAD APP ID + UPN  (incase we have the same UPN but for different app)
    not_revoked: true
};

// The Cloud Datastore key for the new entry
const ext_app_user_kind = 'ext_app_user';

const ext_app_user_keyfield = datastore.key([ext_app_user_kind, ext_app_user.ext_app_user_id]);


// Prepares the new entry
const ext_app_user_entry = {
    key: ext_app_user_keyfield,
    data: ext_app_user
};

// Saves the entity (new will insert, existing will update)
datastore.save(ext_app_user_entry, function(err)
{
    if (!err)
    {
        console.log('Created User entry : ' + ext_app_user.ext_app_user_id);

    }
    else
    {
        console.log('Error: ' + err);
    }
});

var ext_app_user_token = {
    // ** USE SHA256 OF APPID-SOURCE-USER COMBO    
    ext_app_user_token_id: ext_app_user.ext_app_user_token_id, //Key for token is AAD APP ID + UPN
    aad_app_id: ext_app.aad_app_id,
    access_token: aes_cipher.encrypt('NA'),
    expires: Date.now(),
    refresh_token: aes_cipher.encrypt('AQABAAAAAABHh4kmS_aKT5XrjzxRAtHzkrTUwjg2_RxpAUpX9K3kWm_HX-DVs_rVqLb74KYUfKIjJTkJzE7HJdmswtFO5BrTLSuk6pmPWrKQsFxxrvmBVIryVMo46revB2kHVNTsjhoK6HaBxeQq2ut68gdtdeaRMO7qyebTd4Fd0ulP9Vq9liI0NxwpKzXMX7d1cKbxTrfyr4SjZIPfFDPL6lr508jX5SuURboS82QaKcqymjWPFK0iGm9b6n_gsWX2TzxoC_s6AnaAoZ2MA1OkmBeJfr4SYoby8T5-foct8XgHP2dQWSQZa0cNTUrd_KGRs2tGLjAVd1ILw6hPfG3z02oCw1v1kmLi_Vc18uhzBqch7VvAPZgn7uW9quXf9neWRDyJP90BXgPJX8o7lcL-EQPoqEcbuUC8RFnC5JvYOgMPLywUaSa_AIOzf0YXRBOGR1gOIV_2JejWjaYhaKfB0xnTWKkwvgHeVs3KzlwXZjVcxpPv_17awCEaX507bkYXJSkxI-k1tkROi4euH6agcOTf6fVKjH833cnxGFLFCv__rkKqwf-SGdBo6UdooELVVY-A-uz_dBYx6K9nP9__bBArgbTlWq24IfxqjrrVl7vqYOHeVM8_Z3V4lvk_YNu0TqqYiEmZPzTQrZGiF5AUwuNBwkgtFbJCd09whzEE8FGFaBbf1K1PnMinaVz6H-2Zfl6KBqMqxswvbyLAiIn7MjzqvQY3DvOQVZ6U7ENXZ_nsTvX0YLPX0hIg7XgOZaQ0YOh0OFogAA'),
    id_token: aes_cipher.encrypt('NA'),
    not_revoked: true
};


// The Cloud Datastore key for the new entry
const ext_app_user_token_kind = 'ext_app_user_token';
const ext_app_user_token_keyfield = datastore.key([ext_app_user_token_kind, ext_app_user_token.ext_app_user_token_id]);


// Prepares the new entry
const ext_app_user_token_entry = {
    key: ext_app_user_token_keyfield,
    data: ext_app_user_token,
    excludeFromIndexes: ['access_token', 'refresh_token', 'id_token']
};

// Saves the entity (new will insert, existing will update)
datastore.save(ext_app_user_token_entry, function(err)
{
    if (!err)
    {
        console.log('Created User Token entry : ' + ext_app_user_token.ext_app_user_token_id);

    }
    else
    {
        console.log('Error: ' + err);
    }
});


//*******   REGISTER USER REQUEST KEY *******

//Generate random alpha numeric key for user device/source registration
var regkey = 'dummykey';

console.log('KEY ' + regkey);
console.log('USER ' + ext_app_user_token.ext_app_user_id);

var ext_app_user_regkey = {
    regkey: regkey,
    aad_app_id: ext_app.aad_app_id,
    ext_user_id: ext_app_user_token.ext_app_user_id,  
    expires: Date.now() + msin5min
    
};

const ext_app_user_regkey_kind = 'ext_app_user_regkey'; //new temp reg keys
const ext_app_user_regkey_keyfield = datastore.key([ext_app_user_regkey_kind, regkey]);

// Prepares the new entry
const ext_app_user_regkey_entry = {
    key: ext_app_user_regkey_keyfield,
    data: ext_app_user_regkey//,
//    excludeFromIndexes: ['access_token', 'refresh_token', 'id_token']
};

// Saves the entity (new will insert, existing will update)
datastore.save(ext_app_user_regkey_entry, function(err)
{
    if (!err)
    {
        console.log('Created RegKey entry : ' + regkey);

    }
    else
    {
        console.log('Error: ' + err);
    }
});


//****   GETTING SINGLE RECORD FROM STORE....
var itemkey = datastore.key([ext_app_kind, ext_app.aad_app_id]);

datastore.get(itemkey, function(err, objectreceived) 
{
    if (objectreceived)
    {
        console.log('APP NAME AQUIRED: ' + objectreceived.ext_app_name );
        console.log('APP SECRET AQUIRED: ' + aes_cipher.decrypt(objectreceived.aad_app_secret) );
    }
    else
    {   
        console.log('APP KEY NOT FOUND!');
    }
      
});

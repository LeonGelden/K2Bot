var https = require('https');
var querystring = require('querystring');
var hashmap = require('hashmap');


// ****************************  BEGIN TOKEN FUNCTIONS **********************

var GetBearerToken = function(user_id)
{
    return new Promise(function(resolve, reject)
    {
        try
        {
            var req_body = {
                user_id: user_id
            };
            //content that needs to be sent to server
            var bodystring = querystring.stringify(req_body);

            console.log('GetBearerToken bodystring: ' + bodystring);

            //TOKEN SERVICE HTTP Connection options
            var http_options = {
                hostname: 'alfred-g.appspot.com',
                port: 443,
                path: '/api/tokenservice/preview/usertoken',  
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', 
                    'Content-Length': bodystring.length,
                    'X-K2-API-Key': '0372ff28-9a79-4aed-818d-a8401c57b864'
                  } 
              }; 

            //Create the Request
            var http_req = https.request(http_options, function(http_res) 
            {
                http_res.setEncoding('utf8');

                var res_data ='';

                http_res.on('data', function (data_chunk) 
                {
                    res_data += data_chunk;
                });

                http_res.on('end', function () 
                {
                    //Success indicated by response 200
                    if (http_res.statusCode == 200)
                    {
                        resolve(JSON.parse(res_data));
                    }
                    else
                    {
                        reject({Message: 'HTTP Error ' + res_data, http_response: http_res.statusCode});
                    }
                });

                http_res.on('error', function (err) 
                {
                    reject(err);
                });
            }); //end https request

            //On error making request..
            http_req.on('error', function(err) 
            {
                reject(err);
            });

            //Write JSON BODY
            http_req.write(bodystring);
            //make request
            http_req.end(); 
        }
        catch (err)
        {
            reject(err);
        }
    });
}

var GetRegKey = function(user_id)
{
    return new Promise(function(resolve, reject)
    {
        try
        {
            var req_body = {
                user_id: user_id
            };
            //content that needs to be sent to server
            var bodystring = querystring.stringify(req_body);
            //HTTP Connection options
            var http_options = {
                hostname: 'alfred-g.appspot.com',
                port: 443,
                path: '/api/tokenservice/preview/regkey',  
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', 
                    'Content-Length': bodystring.length,
                    'X-K2-API-Key': '0372ff28-9a79-4aed-818d-a8401c57b864'
                  } 
              };      

            //Create the Request
            var http_req = https.request(http_options, function(http_res) 
            {
                http_res.setEncoding('utf8');

                var res_data ='';

                http_res.on('data', function (data_chunk) 
                {
                    res_data += data_chunk;
                });

                http_res.on('end', function () 
                {
                    //Success indicated by response 200
                    if (http_res.statusCode == 200)
                    {
                        resolve(JSON.parse(res_data));
                    }
                    else
                    {
                        reject({Message: 'HTTP Error ' + res_data, http_response: http_res.statusCode});
                    }
                });

                http_res.on('error', function (err) 
                {
                    reject(err);
                });
            }); //end https request

            //On error making request..
            http_req.on('error', function(err) 
            {
                reject(err);
            });

            //Write JSON BODY
            http_req.write(bodystring);
            //make request
            http_req.end(); 
        }
        catch (err)
        {
            reject(err);
        }
    });
}

// ****************************  END TOKEN FUNCTIONS **********************

//HTTP Connection options
var options = {
      hostname: 'k2klowd.onk2qa.com',
      port: 443,
      path: 'TBD',  //optional username param for impersonate..
      method: 'TBD',
      headers: {
         //'Content-Type': 'application/json',
         // 'Authorization': 'Basic xxxxxxxxxxxxxxxxxxxx==' //Authorization header for basic is base64 encoded..
        //OAUTH BEARER TOKEN WILL BE USED HERE
      }//,
      
    };


//Start a Leave Req Process
var callk2startleavereq = function(req, res, bearer_token)
{
      options.headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearer_token
    }
    
    //Leave Request JSON for K2 API HTTP POST
    var leavereq = {
                "folio": "TBD",
                "expectedDuration": 86400,
                "priority": 1,
                "dataFields": 
                    {
                        "Start Date": "2017-09-29T00:00:00Z",
                        "End Date": "2017-09-30T00:00:00Z",
                        "Leave Type": "Paid Time Off"
                    }
               };

    options.path = '/Api/workflow/preview/workflows/7';
    options.method = 'POST';

    //capture leave request fields from request parameters
        leavereq.folio = 'New ' + leavereq.dataFields["Leave Type"] + ' Request Submitted via K2 SmartVoice ' + Date.now();
        leavereq.dataFields["Start Date"] = req.body.result.parameters.startdate + 'T09:00:00Z';
        leavereq.dataFields["End Date"] = req.body.result.parameters.enddate + 'T09:00:00Z';
        leavereq.dataFields["Leave Type"] = req.body.result.parameters.leavetype;
    
    //LOG
    //console.log(JSON.stringify(leavereq))
    
    var reqk2 = https.request(options, function(resk2) 
    {
        resk2.setEncoding('utf8');
        resk2.on('data', function (body) 
        {
            if (resk2.statusCode == 200)
            {   
                var k2response = JSON.parse(body);

                response = 'Great! I submitted a leave request for ' + req.body.result.parameters.leavetype+ ' for you from ' + req.body.result.parameters.startdate + ' until ' + req.body.result.parameters.enddate + '. ';
            }
            else
            {
                 response = 'Invalid response code ' + res.statusCode + ' with detail ' + body;
            }
            
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
            //"speech" is the spoken version of the response, "displayText" is the visual version
        });
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });
    
    //On Write - Write JSON BODY
    reqk2.write(JSON.stringify(leavereq));
    // write data to request body
    reqk2.end(); 
}

var callk2tasksall = function(req, res, bearer_token)
{
      options.headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearer_token
    }
    
    options.path = '/Api/workflow/preview/tasks';
    options.method = 'GET';
    
    var reqk2 = https.request(options, function(resk2) 
    {
        var response = '';
        
        resk2.setEncoding('utf8');
        resk2.on('data', function (body) 
        {
            if (resk2.statusCode == 200)
            {   
                var k2response = JSON.parse(body);
                
                response = 'You have '; 
                
                //check if there are tasks and break them down
                if (k2response.itemCount == 0)
                {                    
                    response += 'no outstanding tasks at this time.';    
                }
                else if (k2response.itemCount > 10 )
                {   
                    //too many tasks to break down ?
                    response += 'a total of ' + k2response.itemCount + ' tasks.\n ';                    
                }
                else
                {
                    //Break down the tasks by process name 
                    //and provide user with a summary of how many
                    var taskgroups = new hashmap();

                    k2response.tasks.forEach(task => 
                    {
                        var procname = task.workflowName.toLowerCase();
                        var procdispname = task.workflowDisplayName;

                        if (!taskgroups.has(procname))
                        {   
                            //First one.. set the count for this
                            //procname to 1
                            var taskgroup = {
                                    "sysname": procname, 
                                    "dispname": procdispname, 
                                    "count": 1
                                    };

                            taskgroups.set(procname, taskgroup);
                        }
                        else
                        {
                            //increase the count
                            var taskgroup = taskgroups.get(procname);
                            taskgroup.count += 1;
                            taskgroups.set(procname, taskgroup);
                        }
                    }); //end foreach
                    
                    //build speech response
                    var groupcount  = 0
                    var totaltasks = 0;
                    taskgroups.forEach(function(value, key)
                    {
                        //prepend the 'and' for more than 1 groups
                        if (groupcount > 0)
                             response += 'and ';

                        response += value.count + ' ' + value.dispname + ' ';

                        totaltasks += value.count;
                        groupcount++;
                    });
                    
                    response += 'task';
                    
                    //plural tasks if more than one task
                    if (totaltasks > 1)
                        response += 's';
                    
                    response += '.';
                }
            } // end if http = 200
            else
            {
                 response = 'Invalid response code ' + res.statusCode + ' with detail ' + body;
            }

            res.send(JSON.stringify({ "speech": response, "displayText": response }));
            //"speech" is the spoken version of the response, "displayText" is the visual version
        });
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });
    // write data to request body
    reqk2.end(); 
}


var callk2tasksforproc = function(procnamefilter, req, res, bearer_token)
{
    options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + bearer_token
    }

    options.path = '/Api/workflow/preview/tasks';
    options.method = 'GET';
    
    var reqk2 = https.request(options, function(resk2) 
    {
        var response = '';
        
        resk2.setEncoding('utf8');
        resk2.on('data', function (body) 
        {
            if (resk2.statusCode == 200)
            {   
                var k2response = JSON.parse(body);
                
                response = 'You have '; 
                
                //check if there are tasks and break them down
                if (k2response.itemCount == 0)
                {                    
                    response += 'no outstanding tasks at this time.';    
                }
                else if (k2response.itemCount > 10 )
                {   
                    //too many tasks to break down ?
                    response += 'a total of ' + k2response.itemCount + ' tasks.\n ';                    
                }
                else
                {
                    //Go through all tasks returned and filter out only
                    //specific proc name
                    var procdispname = '';
                    var procname = '';
                    var taskgroups = new hashmap();

                    k2response.tasks.forEach(task => 
                    {
                        procnamefilter = procnamefilter.toLowerCase();
                        procname = task.workflowName.toLowerCase();
                        procdispname = task.workflowDisplayName;
                        
                        //pick out only the specified proc's items that
                        //match the proc name filter
                        if (procname == procnamefilter)
                        {
                            //build up a list of different event names
                            var wfeventname = task.eventName.toLowerCase();

                            if (!taskgroups.has(wfeventname))
                            {   
                                //First one.. set the count for this
                                //event name to 1
                                var taskgroup = {
                                        "sysname": wfeventname, 
                                        "dispname": wfeventname,
                                        "wfname": procdispname,
                                        "count": 1
                                        };

                                taskgroups.set(wfeventname, taskgroup);
                            }
                            else
                            {
                                //increase the count
                                var taskgroup = taskgroups.get(wfeventname);
                                taskgroup.count += 1;
                                taskgroups.set(wfeventname, taskgroup);
                            }
                        }
                    }); //end foreach
                    
                    //build speech response
                    var groupcount  = 0
                    var totaltasks = 0;
                    
                    taskgroups.forEach(function(value, key)
                    {
                        //prepend the 'and' for more than 1 groups
                        if (groupcount > 0)
                             response += 'and ';

                        response += value.count + ' ' + value.dispname + ' ';
                        totaltasks += value.count;
                        groupcount++;
                    });                    
                    
                    if (totaltasks > 0)
                    {
                        response += procdispname + ' task';

                        //plural tasks if more than one task
                        if (totaltasks > 1)
                            response += 's';

                        response += '.';
                    }
                    else
                    {
                        response = 'you currently have no outstanding tasks of this type. You can say: \'Get all my tasks\', to retrieve a summary of all available tasks';
                    }
                }
            } // end if http = 200
            else
            {
                 response = 'Invalid response code ' + res.statusCode + ' with detail ' + body;
            }
            
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
            //"speech" is the spoken version of the response, "displayText" is the visual version
        });
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });
    
    // write data to request body
    reqk2.end(); 
}

var callk2opentask = function(procnamefilter, taskposition, req, res, bearer_token)
{
    options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + bearer_token
    }
    
    options.path = '/Api/workflow/preview/tasks';
    options.method = 'GET';
    
    var reqk2 = https.request(options, function(resk2) 
    {
        var response = '';
        
        resk2.setEncoding('utf8');
        resk2.on('data', function (body) 
        {
             var taskparams = 
             {
                "actionslist": "NaN",
                "serialno": "NaN"
            };
            
            if (resk2.statusCode == 200)
            {   
                var k2response = JSON.parse(body);
                
                response = 'You have '; 
                
                //check if there are tasks and break them down
                if (k2response.itemCount == 0)
                {                    
                    response += 'no outstanding tasks at this time.';    
                }
                else
                {                    
                    //Go through all tasks returned and filter out only
                    //specific tasks asked for
                    var filteredtasks = new hashmap();

                    k2response.tasks.forEach(task => 
                    {
                        procnamefilter = procnamefilter.toLowerCase();

                        var procname = task.workflowName.toLowerCase();
                        //pick out only the specified proc's items that
                        //match the proc name filter and only if filter is not NaN (i.e. no filter)
                        var taskisfiltered = ((procnamefilter != 'nan') && (procname != procnamefilter))?true:false;
                        
                        if (!taskisfiltered)
                        {
                            //build list of tasks
                            filteredtasks.set(task.serialNumber, task);
                        }
                    }); //end foreach
                    
                    //Figure out if its first/last/next/specific task to open..
                    var ordinalpos = 0; //default to first task..
                    
                    if (filteredtasks.size > 0)
                    {
                        ordinalpos = (taskposition == 'last')?filteredtasks.size-1:0;
                        taskparams.actionslist = JSON.stringify(filteredtasks.values()[ordinalpos].actions.batchableActions);
                        taskparams.serialno = filteredtasks.values()[ordinalpos].serialNumber;
                        response = filteredtasks.values()[ordinalpos].instruction;
                    }
                    else
                    {
                        response = "I was unable to locate that task, please try again."
                    }
                }
            } // end if http = 200
            else
            {
                 response = 'Invalid response code ' + res.statusCode + ' with detail ' + body;
            }
            
            console.log('RESPONSE TEXT: ' + response);
           
            var taskobj = 
            {
                "name": "task-context",
                "lifespan": 5, //lifespan of 1 only allows one action..
                "parameters": taskparams
            };
            var responseobject = 
            {
                "speech": response,
                "displayText": response,
                "contextOut": [taskobj]
            };
            
            res.send(JSON.stringify(responseobject));
            //"speech" is the spoken version of the response, "displayText" is the visual version
        });
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });
    
    // write data to request body
    reqk2.end(); 
}

//action a task..
var callk2actiontask = function(serialno, actionvalue, actionslist, req, res, bearer_token)
{
    options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + bearer_token
    }
    
    console.log('starting action: ' + actionvalue);
    
    options.path = '/Api/Workflow/preview/tasks/' + serialno + '/actions/' + actionvalue;
    options.method = 'POST';
    
    console.log('URL:' + options.path);

    var reqk2 = https.request(options, function(resk2) 
    {
        resk2.setEncoding('utf8');
        
        //NOTE - Response is blank, so there is no waiting for 'data' event.
        if ((resk2.statusCode == 200) || (resk2.statusCode == 204)) 
        {   
            response = 'Great! I actioned this task with ' + actionvalue + '. ';
        }
        else if ((resk2.statusCode == 400) || (resk2.statusCode == 404)) 
        {
            response = 'Sorry, I was not able to action this task. please try again'; 
        }
        else
        {
             response = 'Invalid response code ' + res.statusCode;
        }
            
        res.send(JSON.stringify({ "speech": response, "displayText": response }));
        //"speech" is the spoken version of the response, "displayText" is the visual version
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });

    //On Write - Write BLANK JSON BODY
    reqk2.write('{}');

    // end request.
    reqk2.end(); 
}

//action a task..
var callk2redirecttask = function(serialno, destname, givenname, req, res, bearer_token)
{
    options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + bearer_token
    }
    
    console.log('starting redirect to: ' + givenname);
    
    options.path = '/Api/Workflow/preview/tasks/' + serialno + '/actions/redirect';
    options.method = 'POST';
    
    console.log('URL:' + options.path);

    var reqk2 = https.request(options, function(resk2) 
    {
        resk2.setEncoding('utf8');
        
        //NOTE - Response is blank, so there is no waiting for 'data' event.
        if ((resk2.statusCode == 200) || (resk2.statusCode == 204)) 
        {   
            response = 'Great! I redirected this task to ' + givenname + '. ';
        }
        else if ((resk2.statusCode == 400) || (resk2.statusCode == 404)) 
        {
            response = 'Sorry, I was not able to action this task. please try again'; 
        }
        else
        {
             response = 'Invalid response code ' + res.statusCode + ' with detail ' + body;
        }
            
        res.send(JSON.stringify({ "speech": response, "displayText": response }));
        //"speech" is the spoken version of the response, "displayText" is the visual version
    });
    
    reqk2.on('error', function(e) 
    {
            response = 'problem with request. Error ' + e.message;
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
    });

    //On Write - Write BLANK JSON BODY
    reqk2.write('{"RedirectTo": "' + destname + '\"}');
    
    // end request.
    reqk2.end(); 
}
/*
* HTTP Cloud Function.
*
* @param {Object} req Cloud Function request context.
* @param {Object} res Cloud Function response context.
*/

// ***********************  REQUEST RESOLVING **************

function processTasks(access_token, req, res)
{
    var intentaction = req.body.result.action;

    if (intentaction == 'submit-time-off-request')
    {
        callk2startleavereq(req, res, access_token);
    }
    else if (intentaction == 'get-all-tasks-summary')
    {
        callk2tasksall(req, res, access_token);
    }
    else if (intentaction == 'get-specific-tasks')
    {
        var processname = req.body.result.parameters.k2process;

        callk2tasksforproc(processname, req, res, access_token);
    }
    else if (intentaction == 'open-task')
    {
        var taskposition = req.body.result.parameters.taskposition;
        //If specific process name context exists, extract proc name
        var processname = 'NaN';

        req.body.result.contexts.forEach(context => 
        {
            if (context.name == 'specific-process-tasks')
            {
                processname = (context.parameters.k2process != undefined)?context.parameters.k2process:processname;
            }
        });

        callk2opentask(processname, taskposition, req, res, access_token);
    }
    else if (intentaction == 'action-task')
    {
        //Get task-context for serial, etc.
        var serialno = 'NaN';
        var actionslist = 'NaN'
        var actionvalue = 'NaN';

        req.body.result.contexts.forEach(context => 
        {
            if (context.name == 'task-context')
            {
                serialno = (context.parameters.serialno != undefined)?context.parameters.serialno:serialno;
                actionslist = (context.parameters.actionslist != undefined)?context.parameters.actionslist:actionslist;
                actionvalue = (context.parameters.actionvalue != undefined)?context.parameters.actionvalue:actionvalue;
            }
        });

        if ((serialno == 'NaN') || (serialno == 'NaN') || (serialno == 'NaN'))
        {
            response = 'I\'m sorry, I dont seem to have all the information needed. Please retry the action on this task';
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
        }
        else
        {
            callk2actiontask(serialno, actionvalue, actionslist, req, res, access_token);
        }
    }
    else if (intentaction == 'redirect-task')
    {
        //Get task-context for serial, etc.
        var serialno = 'NaN';
        // var actionslist = 'NaN'
        //  var actionvalue = 'NaN';
        var destname = 'AAD:adriaan@k2cloudprev02.onmicrosoft.com';
        var givenname = 'NaN';

        req.body.result.contexts.forEach(context => 
        {
            if (context.name == 'task-context')
            {
                givenname = (context.parameters.givenname != undefined)?context.parameters.givenname:givenname;
                serialno = (context.parameters.serialno != undefined)?context.parameters.serialno:serialno;
                //actionslist = (context.parameters.actionslist != undefined)?context.parameters.actionslist:actionslist;
                // actionvalue = (context.parameters.actionvalue != undefined)?context.parameters.actionvalue:actionvalue;
            }
        });

        if ((serialno == 'NaN') || (givenname == 'NaN')) //(serialno == 'NaN') || (serialno == 'NaN'))
        {
            response = 'I\'m sorry, I dont seem to have all the information needed. Please retry the action on this task';
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
        }
        else
        {
            callk2redirecttask(serialno, destname, givenname, req, res, access_token);
        }
    }
    else
    {
        console.log('WARNING - ACTION NOT FOUND');         
        res.send(req.body.result.fulfillment);
    }  
}

function getRequestUser(req_body)
{
    var ret_user = {
        source: undefined,
        userid: undefined,
        locale: 'en-US'
        
    };
    
   //must have a original-request item that will contain user data.
   if (req_body.originalRequest)
   {
       ret_user.source = req_body.originalRequest.source;
       
       if (ret_user.source == 'google')
       {
            ret_user.userid = req_body.originalRequest.data.user.userId;
            ret_user.locale = req_body.originalRequest.data.user.locale;
       }
       else if (ret_user.source == 'skype')
       {
            ret_user.userid = req_body.originalRequest.data.user.id;
       }
       else if (ret_user.source == 'facebook')
       {
            ret_user.userid = req_body.originalRequest.data.sender.id + '-' + req_body.originalRequest.data.recipient.id;
       }
   }

    return ret_user;
}

function checkAuthAndGo(req, res)
{
    
    var response = '';
    var apikey = req.get('X-K2-API-Key');
    var validKey = (apikey == '0372ff28-9a79-4aed-818d-a8401c57b864')?true:false;

    //Only support POST 
    if (req.method == 'POST') 
    {
        if (validKey)
        {
            res.setHeader('Content-Type', 'application/json'); // RespoRequires application/json MIME type
            
            console.log('request: ' + req.message);
            //build user FQN
            var userobj = getRequestUser(req.body);

            if (userobj.userid != undefined)
            {
                var user_fqn = userobj.source + '-' + userobj.userid;

                //Try and get a token for user..
                GetBearerToken(user_fqn)
                    .then (function(token_request)
                    {
                        //VALID TOKEN START TASK PROCESSING..
                        processTasks(token_request.access_token, req, res);

                    })
                    .catch(function(err)
                    {
                        if (err.http_response == 400)
                        {
                            GetRegKey(user_fqn)
                                .then(function(reg_key)
                                {
                                    response = 'You seem new to these here parts..  To register, please go to ' + reg_key.login_url + ' and use the key ';
                                    var text_response = response + reg_key.regkey;
                                    var speech_response = '<speak>' + response + '<break time="0.5s"/><say-as interpret-as="characters">' + reg_key.regkey + '</say-as></speak>';
                                    res.send(JSON.stringify({ "speech": speech_response, "displayText": text_response }));

                                })
                                .catch(function(err)
                                {
                                    console.log(err);
                                    response = 'Error obtaining a Registration Key. Please try again later.';
                                    res.send(JSON.stringify({ "speech": response, "displayText": response }));
                                })
                        }
                        else
                        {
                            console.log(err);
                            response = 'Error obtaining a login token. Please try again later.';
                            res.send(JSON.stringify({ "speech": response, "displayText": response }));
                        }
                    });    
            }
            else                
            {
                response = 'Sorry, I only support Google Voice, Facebook, Skype and Skype for business conversations';
                res.send(JSON.stringify({ "speech": response, "displayText": response }));
            }
        }
        else        
        {
            console.log('Invalid API Key');      
            response = 'Sorry, I am experiencing an API Key configuration error. Please try again later';
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
        
        }

    }
    else
    {
        console.log('ERROR 500 - Not a POST reuest');         
        res.status(500).send({ error: 'REQUEST TYPE NOT SUPPORTED'});
    }
    
}

exports.alfredGApi = function alfredGApi(req, res) 
{
    console.log(JSON.stringify(req.body));     
    
    checkAuthAndGo(req, res);    
};
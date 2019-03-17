/******************************************************************fitbit.js***************************************************************************************
 * This code has services to access Fitbit data of the users who have given their consent by signing through our url.When user access the url ,user is redirected to
 * Fitbit login and consent page .Once user gives consent ,user profile and access Tokens are stored  in Dynamo Db.We have several services here to fetch Fitbit data
 * like steps,sleep,activities . Tokens gets auto refreshed every day before it expires by scheduler.js which runs a schedule to refresh tokens .Therefore user doesnt
 * have to login again***/

'use strict';
var express = require('express');
const fs = require('fs');
var app = express();
const OAuth2 = require('simple-oauth2').create;
const Request = require('request');
var http = require('http');
var https = require('https');
var Fitbit = require('../dist/Fitbit').Fitbit;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var AWS = require('aws-sdk');
var customAgent = new https.Agent({ ca: fs.readFileSync('ca-bundle.crt')});
AWS.config.update({
httpOptions: { agent: customAgent },
region:  "ap-southeast-1"
});

app.use(cookieParser());
app.use(session({secret: 'bigSecret'}));
var dbload = require("./load.js");
var Moment = require('moment');
var options = {
  key: fs.readFileSync('/home/ubuntu/cert/key.pem'),
  cert: fs.readFileSync('/home/ubuntu/cert/cert.pem'),
  ca: fs.readFileSync('./ca-bundle.crt')
};

https.createServer(options, app).listen(9000);
var code;
var options = {
    creds: {
        clientID: "***********",
        clientSecret: "***************"
    },
    uris: {
        "authorizationUri": "https://www.fitbit.com",
        "authorizationPath": "/oauth2/authorize",
        "tokenUri": "https://api.fitbit.com",
        "tokenPath": "/oauth2/token"
    },
    authorization_uri: {
        "redirect_uri": "https://ec2-52-77-219-60.ap-southeast-1.compute.amazonaws.com:9000/oauth_callback",
	"response_type": "code",
	"expires_in": "2592000",
	"prompt": "login consent",
        "scope": "activity social profile heartrate location settings sleep",
        "state": "3(#0/!~"
    }
};

// Set the region
// Create the DynamoDB service object

// OAuth flow
app.get('/', function (req, res) {
    // Create an API client and start authentication via OAuth

    var client = new Fitbit(options);


    res.redirect(client.authorizeURL());

});

app.get('/deletetable',function (req,res) {

     dbload.deletetable(req.query.table);
     res.send("done");	

});	
// On return from the authorization
app.get('/oauth_callback', function (req, res) {
    console.log("##############Request in  Token is **********",req );	
	
    code = req.query.code;
    var client = new Fitbit(options);

    //With Promise
    client.fetchTokenAsync(code).then(function (token) {
        req.session.oauth = token;
        res.redirect('/profile');
       // res.redirect('/activities/steps');
    }, function (err) {
        return res.send(err);
    }); 
	
});	

app.get('/refresh', function (req, res) {
//function getToken( encodedId,callback){

var token=null;
// Create the DynamoDB service object
var ddb = new AWS.DynamoDB.DocumentClient()


var params = {
  TableName: "Fitbit",
  ProjectionExpression:"encodedId,ftoken,displayName"
};


ddb.scan(params, onScan);

function onScan(err, data) {
     //var arr = [];
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
           data.Items.forEach(function(id) {
            refreshTokens(id,function(resp){
	        console.log("**Token Refreshed** \n", id,resp.ftoken);
            });		    
         });
             res.send("done");
    }
   }
});


//app.get('/refresh', function (req, res) {
function refreshTokens(id,callback){
   var client = new Fitbit(options);
   console.log("Finally username is ",id.displayName);

   client.setToken(id.ftoken);
    //With Promise
    client.refresh(function (err,token) {
	var jstr=JSON.stringify({'encodedId' :id.encodedId,'ftoken' :token, 'displayName' :id.displayName});
	dbload.updaterefreshtoken(jstr,function(resp) {    
	console.log("****DB update resp is ",resp);
        callback(resp);		
       });
    }, function (err) {
        return callback(err);
 });

}

app.get('/userid',function (req,res) {

getToken("6WYQ3R",function(response){
   console.log("Finally userid is ",response);
});
 dbload.updateactivities();
if( req.session.oauth.user_id != '')
  res.json(req.session.oauth.user_id);
else res.send(err);
});

app.get('/update/activities',function (req, res) {
    
        var resp=dbload.updateactivities();
        res.send(resp);
});

// Display today's steps for a user
app.get('/activity/steps', function (req, res) {
    var response;	
    var fitbit = new Fitbit(options);
     fitbit.setToken(req.session.oauth);

    fitbit.getDailyStepsAsync(today).then(function (response) {
        res.json(response);
    }, function (err) {
        res.status(400).send(err);
    });
});

       

app.get('/fitbitId',function (req,res) {
      var name=req.query.name;
      getId( name ,function(encId){
      res.end(encId);
     });	      
});	

function getId( displayName,callback){
     
var token=null;	
// Create the DynamoDB service object
var ddb = new AWS.DynamoDB.DocumentClient()
 console.log("EMCODE iD INSIDE FUNC",displayName);

var params = {
  TableName: "Mapping",
  ProjectionExpression:"#dispName,encodedId",
  KeyConditionExpression: "#dispName = :displayName",
 /* Key: {
    "encodedId" : userid,
    "displayName" : "Prateek P"
  },*/
  ExpressionAttributeNames:{
            "#dispName": "displayName"
            },
  ExpressionAttributeValues: {
            ":displayName":displayName
    }
};


// Call DynamoDB to read the item from the table
ddb.query(params, function(err, data) {
  if (err){
    console.log("Error*****************", err);
     return callback(err);
  } else {
    //console.log("Success*********************", data.Items.ftoken);
    data.Items.forEach(function( item){
	 console.log("Token Values is &&&&&&&&",item.encodedId);
	 token = item.encodedId;
	 return callback(item.encodedId);
    });
  }
});
}


function getToken( encodedId,callback){

var token=null;
// Create the DynamoDB service object
var ddb = new AWS.DynamoDB.DocumentClient()
 console.log("EMCODE iD INSIDE FUNC",encodedId);


var params = {
  TableName: "Fitbit",
  ProjectionExpression:"#enId,ftoken,displayName",
  KeyConditionExpression: "#enId = :encodedId",
 /* Key: {
    "encodedId" : userid,
    "displayName" : "Prateek P"
  },*/
  ExpressionAttributeNames:{
            "#enId": "encodedId"
            },
  ExpressionAttributeValues: {
            ":encodedId":encodedId
    }
};


// Call DynamoDB to read the item from the table
ddb.query(params, function(err, data) {
  if (err){
    console.log("Error*****************", err);
     return callback(err);
  } else {
    //console.log("Success*********************", data.Items.ftoken);
    data.Items.forEach(function( item){
         console.log("Token Values is &&&&&&&&",item.ftoken);
         token = item.ftoken;
         return callback(item.ftoken);
    });
  }
});
}
// Display activity for a user
app.get('/activity', function (req, res) {
    var fitbit = new Fitbit(options);
    var startdate = req.query.dt;
    //var enddate = req.query.edt;
    var encodedId =req.query.id; 
    var tok=null;
    console.log("From query ....",startdate,encodedId);
    getToken(encodedId,function(response){
    console.log("Finally got token**********",response);
    tok=response;    
    console.log("date is :",startdate);
    var fibitUrl = "https://api.fitbit.com/1/user/" + encodedId + "/activities/date/" + startdate  + ".json";
    fitbit.setToken(tok);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
	headers: { 'Content-Type': 'application/json' },
    }, function (err, body, tok) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);
            tmp["date"]=startdate;
            tmp["encodedId"]=encodedId;	
	    
            res.send(tmp);
        }
    });

   });
});

app.post('/test', function (req, res) {
    res.send("Hello Prateek");
});	
// Display activity for a user
app.get('/activities/steps', function (req, res) {
    var fitbit = new Fitbit(options);
    var startdate = req.query.sdt;
    var enddate = req.query.edt;	
    var encodedId =req.query.id;
    var tok=null;
    console.log("From query ....",startdate,encodedId);
    getToken(encodedId,function(response){
    tok=response;
    console.log("date is :",startdate);
    var fibitUrl = "https://api.fitbit.com/1/user/" + encodedId + "/activities/steps/date/" + startdate+"/"+enddate + ".json";
    fitbit.setToken(tok);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body, tok) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);

            res.send(tmp);
        }
    });

   });
});

// Display activity for a user
app.get('/activities/distance', function (req, res) {
    var fitbit = new Fitbit(options);
    var startdate = req.query.sdt;
    var enddate = req.query.edt;
    var encodedId =req.query.id;
    var tok=null;
    console.log("From query ....",startdate,encodedId);
    getToken(encodedId,function(response){
    console.log("Finally got token**********",response);
    tok=response;
    console.log("date is :",startdate);
    var fibitUrl = "https://api.fitbit.com/1/user/" + encodedId + "/activities/distance/date/" + startdate+"/"+enddate + ".json";
    fitbit.setToken(tok);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body, tok) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);

            res.send(tmp);
          }
      });

    });
});

app.get('/leaderboard/steps', function (req, res) {
 var docClient = new AWS.DynamoDB.DocumentClient();
 var totalSteps=0;
 var params = {
     TableName: "WeeklySteps",
     ProjectionExpression: "encodedId,weeklysteps,displayName,avatar"
  };

console.log("Scanning Fitbit table.");
docClient.scan(params, onScan);

function onScan(err, data) {
     var arr = []; 
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
           data.Items.forEach(function(steps) {
           arr.push({'weeklysteps' :steps.weeklysteps,'displayname' : steps.displayName, 'id' : steps.encodedId, 'avatar' :steps.avatar });
   });
	     console.log("Weekly/n",arr)
	     res.status(200).end(JSON.stringify(arr));
}	
}
});

app.get('/update/leaderboardsteps', function (req, res) {
 var docClient = new AWS.DynamoDB.DocumentClient();
 var totalSteps=0;
  var params = {
     TableName: "Fitbit",
     "ScanIndexForward": false,
     ProjectionExpression: "encodedId,ftoken,displayName,avatar"
  };

console.log("Scanning Fitbit table.");
docClient.scan(params, onScan);

function onScan(err, data) {
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
           data.Items.forEach(function(encId) {
           console.log("@@@@encodedid/n,***ftoken ***,refresh",encId.encodedId,encId.ftoken,encId.ftoken.refresh_token,encId.avatar);
           executeweekly(encId.encodedId,encId.ftoken,function(response){
	   for (var i = 0; i < response['activities-tracker-steps'].length; i++){
             console.log("Response is!!!!!!! ",totalSteps += Number(response['activities-tracker-steps'][i].value));
           }
           console.log("Total Step,Encoded Id,DisplayName",totalSteps,encId.encodedId,encId.displayName);
	   var tmp=JSON.stringify({ 'weeklysteps':totalSteps,'encodedId':encId.encodedId,'displayName':encId.displayName,'updatedate':today,'avatar' :encId.avatar });
	   dbload.loadweeklysteps(tmp,function(resp){
           console.log("update weekly steps",resp );

           });
		   
	   totalSteps=0;
      });

 });

     if (typeof data.LastEvaluatedKey != "undefined") {
            console.log("Scanning for more...");
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            docClient.scan(params, onScan);
        }
    }
}
res.send("success");

});

var today = new Date();
var dd = today.getDate();

var mm = today.getMonth()+1;
var yyyy = today.getFullYear();
if(dd<10)
{
    dd='0'+dd;
}

if(mm<10)
{
    mm='0'+mm;
}
today = yyyy+'-'+mm+'-'+dd;
console.log(today);


// Display activity for a user
function  executeweekly(encId,ftoken,callback) {
    var fitbit = new Fitbit(options);
//    var encodedId =req.query.id;
    var encodedId=encId;
    var tok=null;
    //fitbit.refreshAccessToken(ftoken.access_token,ftoken.refresktoken,ftoken.expires_in);
    console.log("From query ****....",encId,ftoken);
     var fibitUrl = "https://api.fitbit.com/1/user/" + encodedId + "/activities/tracker/steps/date/"+today+"/1w"+".json";
    fitbit.setToken(ftoken);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body) {
        if (err) {
            console.log(err);
            return callback(err);
        } else {
            var tmp =JSON.parse(body);
            console.log("Steps  is",tmp); 
            return callback(tmp);
        }
       	    
   });
}

// Display activity for a user
app.get('/activities/calories', function (req, res) {
    var fitbit = new Fitbit(options);
    var startdate = req.query.sdt;
    var enddate = req.query.edt;
    var encodedId =req.query.id;
    var tok=null;
    console.log("From query ....",startdate,encodedId);
    getToken(encodedId,function(response){
    tok=response;
    console.log("date is :",startdate);
    var fibitUrl = "https://api.fitbit.com/1/user/" + encodedId + "/activities/calories/date/" + startdate+"/"+enddate + ".json";
    fitbit.setToken(tok);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body, tok) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);
            res.send(tmp);
        }
    });

   });
});

// Display activity for a user
app.get('/sleep', function (req, res) {
    var fitbit = new Fitbit(options);
    var startdate = req.query.dt;
    var encodedId =req.query.id;
    var tok=null;
    console.log("From query ....",startdate,encodedId);
    getToken(encodedId,function(response){
        console.log("Finally got token**********",response);
        tok=response;
    console.log("date is :",startdate);
    var fibitUrl = "https://api.fitbit.com/1.2/user/" + encodedId + "/sleep/date/" + startdate + ".json";
    fitbit.setToken(tok);
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body, tok) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);
            res.send(tmp);
        }
    });

   });
});

// Display activity for a user
app.get('/profile/', function (req, res) {
    var fitbit = new Fitbit(options);

    var fibitUrl = "https://api.fitbit.com/1/user/" + req.session.oauth.user_id  + "/profile.json";
       
    fitbit.setToken(req.session.oauth);
    console.log("****Token:", req.session.oauth);   

    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
	headers: { 'Content-Type': 'application/json' },
    }, function (err, body, token) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            var tmp =JSON.parse(body);
            tmp["encodedId"]=req.session.oauth.user_id;
            console.log("Complete json****",req);		
	    var session=JSON.stringify({'encodedId':req.session.oauth.user_id ,'displayName': tmp['user'].displayName,'avatar': tmp['user'].avatar,'dateOfBirth': tmp['user'].dateOfBirth,'gender': tmp['user'].gender,'height': tmp['user'].height,'weight': tmp['user'].weight,'ftoken': req.session.oauth});
	    console.log("JSON is*********",session); 	
	    dbload.updateprofile(session,'Fitbit');
	    dbload.updateprofile(session,'Mapping');
	    var data="";
	    res.writeHead(200, {
            'Content-Type': 'text/html',
            'X-Powered-By': 'AstroFit'
            });
	    res.write('<html>');
	    res.write('<body>');
	    data +=" encodedId:";
	    data +=req.session.oauth.user_id;
	    data +=" displayName:";
            data +=tmp['user'].displayName;
	    data +=" avatar:";
	    data +=tmp['user'].avatar;
	    data +=" dateOfBirth:";
	    data +=tmp['user'].dateOfBirth;
	    data +=" gender:";
	    data +=tmp['user'].gender;
	    data += " height:";
	    data += tmp['user'].height;
	    data += tmp['user'].weight;
	    res.write(data);	
	    res.write('</body>');
            res.write('</html>');
            res.end();	
        }
    });
});


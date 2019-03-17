/****This code accesses dynamo DB table and stores & updates Fitbit users profile data */

var AWS = require("aws-sdk");
//var fs = require('fs');
//'use strict';
const fs = require('fs');
var Fitbit = require('../dist/Fitbit').Fitbit;
var cookieParser = require('cookie-parser');
var AWS = require('aws-sdk');
var Moment = require('moment');

var options = {
    creds: {
	 clientID: "xxxxxxx",
         clientSecret: "xxxxxxxxxxx"    
    },
    uris: {
        "authorizationUri": "https://www.fitbit.com",
        "authorizationPath": "/oauth2/authorize",
        "tokenUri": "https://api.fitbit.com",
        "tokenPath": "/oauth2/token"
    },
    authorization_uri: {
        "response_type": "token",
        "expires_in": "31536000",
        "scope": "activity profile heartrate location settings sleep",
        "state": "3(#0/!~"
    }
};

AWS.config.update({
    region: "ap-southeast-1"
});

function deletetable( table )
{
   var dynamodb = new AWS.DynamoDB();  //low-level client

   var tableName = table;


 var params = { 
    TableName : tableName
 };


dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

}	
function loadprofile ( body )
{
  var docClient = new AWS.DynamoDB({apiVersion: '2012-10-08'});

  console.log("Importing profile into DynamoDB. Please wait.");

  var  profile = JSON.parse(body);
     var params = {
       TableName: "Fitness",
        Item: {
	      'token': { "S": profile['token']},
	      'encodedId': { "S": profile['encodedId'] },
              'displayName': { "S": profile['displayName'] },
	      'gender': { "S": profile['gender']},
	      'dateOfBirth': { S: profile['dateOfBirth']},
	      'height': { N: "009"},
	      'weight': { N: "80"}
        }
}

function updateprofile ( body,table )
{
  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("***Importing profile into DynamoDB. Please wait.");
  var  profile = JSON.parse(body);
  var params = {
            TableName: table,
            Key:{
                "encodedId": profile['encodedId'],
                "displayName":   profile['displayName']
            },
	    UpdateExpression: "SET   ftoken = :ftoken, gender = :gender, avatar = :avatar" ,
            ExpressionAttributeValues: { ':ftoken': profile['ftoken'] , ':gender': profile['gender'], ':avatar': profile['avatar'] },
            ReturnValues: "UPDATED_NEW"
        };

    docClient.update(params, function(err, data) {
       if (err) {
           console.error("Unable to add date,steps", JSON.stringify(err, null, 2));
       } else {
	   console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
       }
    });
}
function updaterefreshtoken ( body ,callback)
{
  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("***Importing profile into DynamoDB. Please wait.");
  var  profile = JSON.parse(body);
  var params = {
            TableName: "Fitbit",
            Key:{
                "encodedId": profile['encodedId'],
                "displayName":   profile['displayName']
            },
            UpdateExpression: "SET   ftoken = :ftoken ",
            ExpressionAttributeValues: { ':ftoken': profile['ftoken']  },
            ReturnValues: "UPDATED_NEW"
        };

    docClient.update(params, function(err, data) {
       if (err) {
           console.error("Unable to add date,steps", JSON.stringify(err, null, 2));
	   return callback(err);   
       } else {
           console.log("UpdateToken Succeeded:", JSON.stringify(data, null, 2));
	  return  callback("success");
       }
    });
}
function updateactivities()
{

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
     TableName: "Fitbit",
     ProjectionExpression: "ftoken,displayName"
  };

console.log("Scanning Fitbit table.");
docClient.scan(params, onScan);

function onScan(err, data) {
    let jtoken;	
    if (err) {
        return err;
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
           data.Items.forEach(function(tok) {
	   console.log("***json string is*** ",tok);
           activity(tok,function(resp){	   
	   console.log("Activity update success",resp);
           return resp;
	   });
        });

        if (typeof data.LastEvaluatedKey != "undefined") {
            console.log("Scanning for more...");
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            docClient.scan(params, onScan);
        }
    }
}
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

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


function  activity ( tok,callback ) {
    var fitbit = new Fitbit(options);
    var token=tok;

    //var today = "2018-10-17";
    console.log("date is :",today,"token inside activity func",token.ftoken);
    var fibitUrl = "https://api.fitbit.com/1/user/" + token.ftoken.user_id + "/activities/date/" + today + ".json";
    console.log("Before tok set");	
    fitbit.setToken(token.ftoken);
    console.log("After token set");	
    fitbit.request({
        uri: fibitUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }, function (err, body) {
        if (err) {
	    
            console.log("Error log for token", err);
	    callback(err);
        } else {
            var tmp =JSON.parse(body);
            tmp["dat"]=today;
	    console.log("Token is **************\n",token.ftoken,"Display Name is **********\n",token.ftoken.user_id);
            tmp["encodedId"]=token.ftoken.user_id;
            tmp["displayName"]=token.displayName;
           loadactivities(JSON.stringify(tmp));
	   callback(true);
        }
    });
}


function loadweeklysteps(body,callback)
{
   var docClient = new AWS.DynamoDB.DocumentClient();
   var  weeksteps = JSON.parse(body);
   var params = {
            TableName: "WeeklySteps",
	    IndexName: "weeklysteps",
            Key:{
                "encodedId": weeksteps['encodedId']
            },
	   UpdateExpression: "SET   weeklysteps = :weeklysteps , displayName = :displayName ,  updatedate = :updatedate , avatar = :avatar",
            ExpressionAttributeValues: { ':weeklysteps': weeksteps['weeklysteps'],':displayName': weeksteps['displayName'],':avatar': weeksteps['avatar'],':updatedate': weeksteps['updatedate'] },
            ReturnValues: "UPDATED_NEW"
        };
       docClient.update(params, function(err, data) {
       if (err) {
           console.error("Unable to update weekly steps", JSON.stringify(err, null, 2));
	   return callback(err);
       } else {
           //console.log("PutItem succeeded:");
           //moststeps();
           console.log("UpdateWeekly steps  succeeded:", JSON.stringify(data, null, 2));
	   return callback("success");
       }
    });


}	

function loadactivities ( body )
{
  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("***Importing activities into DynamoDB. Please wait.");
  var  activity = JSON.parse(body);
  console.log("Activities**", body);
  console.log("steps  are ",activity.summary['steps']);
  var params = {
            TableName: "Activity",
	    IndexName: "weeklysteps",
            Key:{
                "encodedId": activity['encodedId']
                //"steps":   activity.summary['steps']
            },
	  UpdateExpression: "SET  steps = :steps,  displayName = :displayName, caloriesOut = :caloriesOut, dat = :dat" ,
          ExpressionAttributeValues: { ':steps': activity.summary['steps'], ':displayName': activity['displayName'], ':caloriesOut': activity.summary['caloriesOut'] , ':dat': activity['dat'] },
            ReturnValues: "UPDATED_NEW"
        };

    docClient.update(params, function(err, data) {
       if (err) {
           console.error("Unable to add date,steps", JSON.stringify(err, null, 2));
       } else {
           console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
       }
    });
}



function moststeps(){
    var docClient = new AWS.DynamoDB.DocumentClient();

    var params = {
    "TableName": "Fitness",
    "KeyConditionExpression": 'reviewdate = :reviewdate',
    "ExpressionAttributeValues": {
        ':reviewdate' : '2018-10-15'
    },
    ScanIndexForward: false
};

docClient.query(params, function (err, data) {
    if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
	console.log("Data is",data);
	data.Items.forEach(function(item) {
            console.log(" -", item.encodedId + ": " + item.displayName);
	 }); 	
    }
});

}
module.exports = {
    updateprofile: updateprofile,
    loadweeklysteps: loadweeklysteps,
    updateactivities: updateactivities,
    deletetable: deletetable,	
    updaterefreshtoken: updaterefreshtoken	
}

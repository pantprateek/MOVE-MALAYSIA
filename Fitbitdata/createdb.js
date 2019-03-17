/***********************************************************************createdb.js*****************************************************************************
 * This is reponsible to create database table*/


var AWS = require("aws-sdk");

AWS.config.update({
  region: "ap-southeast-1"
  //endpoint: "http://localhost:9000"
});

var dynamodb = new AWS.DynamoDB();


var params = {
    TableName : "Fitbit",
    KeySchema: [      
	{ AttributeName: "encodedId", KeyType: "HASH" },  //Sort key    
        { AttributeName: "displayName", KeyType: "RANGE"}  //Partition key
    ],
    AttributeDefinitions: [       
	{ AttributeName: "encodedId", AttributeType: "S" },
        { AttributeName: "displayName", AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});


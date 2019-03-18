var request=require("request");
var dateTime = require('node-datetime');
var calories = 0;
var steps =0 ;
var dt = dateTime.create();
var formatted = dt.format('Y-m-d');

exports.handler =  (event,context,callback)=> {
    var initializePromise = initialize();
    initializePromise.then(function(result) {
        var activity = result;
        console.log("Initialized activity details");
        //  activity details from here
        console.log(activity);
        //let jn=JSON.parse(activity);
        calories= activity.summary["caloriesOut"];
        steps= activity.summary["steps"];
        console.log("Calories burned ", calories,"steps : ", steps);
        callback(null,{
        "dialogAction": {
        "type": "Close",
        "fulfillmentState": "Fulfilled",
        "message": {
        "contentType": "PlainText",
        "content": "I can see that, You have only burned "+ calories +" calories"+" and travelled " + steps+ " steps, You should exercise for at least 20 more minutes "
        },
     }
});
    }, function(err) {
        console.log(err);
    })
    
};    



function initialize () {
    
    var options = {
                    uri: "https://ec2-52-77-219-60.ap-southeast-1.compute.amazonaws.com:9000/activity?dt="+formatted+"&id=6XB8KK",
                    rejectUnauthorized: false,
                    requestCert: true,
                    agent: false,
                    timeout: 10000,
                    followRedirect: true,
                    maxRedirects: 10,
                    headers: {
                    'User-Agent': 'request'
                    }
                  };
        // Return new promise 
        return new Promise(function(resolve, reject) {
    	// Do async job
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body));
          }
        })
    })

}          
         



# ASTRO-MOVE

# On Server execute following : 

newfacecom.js : analyzes live image with reference images using Rekognition service .

forever start newfacecom.js

fitbit.js : (1)Stores updates Fitbit user's profile after getting consent (2) Provides Fitbit data to lambda api to Lex and Polly Client running in Raspberry Pi.

forever start fitbit.js 

scheduler.js: refreshes access token before 8 hours of expiration ,so user doesnt have to login again .
forever start scheduler.js

# On Raspberry PI Client :

forever start imagewatch.js 

This script watches for any image change on /tmp/live.jpg and uploads it for face comaprison to the server. On successful person recognition calls polly client to greet the user and launches chatbot which uses lex client .Now user can interact and talk to Lex server
Lex Server in turn fetches Fitbit data to track user's activity and fitness data  and give friendly motivational messages to user .

# Response of Fitbit Server for activity data 
goals: 
   { activeMinutes: 30,
     caloriesOut: 2887,
     distance: 8.05,
     floors: 10,
     steps: 10000 },
  summary: 
   { activeScore: -1,
     activityCalories: 0,
     caloriesBMR: 1186,
     caloriesOut: 1186,
     distances: 
      [ [Object],
        [Object],
        [Object],
        [Object],
        [Object],
        [Object],
        [Object] ],
     elevation: 0,
     fairlyActiveMinutes: 0,
     floors: 0,
     lightlyActiveMinutes: 0,
     marginalCalories: 0,
     sedentaryMinutes: 965,
     steps: 0,
     veryActiveMinutes: 0 },
  date: '2019-03-18',
  encodedId: '6XB8KK' }
2019-03-18T08:05:13.563Z	9d5e634e-0ee7-4bc3-b0f6-ef441af6faa5	Calories burned  1186 steps :  0
END RequestId: 9d5e634e-0ee7-4bc3-b0f6-ef441af6faa5
REPORT RequestId: 9d5e634e-0ee7-4bc3-b0f6-ef441af6faa5	Duration: 1212.71 ms	Billed Duration: 1300 ms 	Memory Size: 128 MB	Max Memory Used: 84 MB	


# Lambda Response to Lex :

{
  "dialogAction": {
    "type": "Close",
    "fulfillmentState": "Fulfilled",
    "message": {
      "contentType": "PlainText",
      "content": "I can see that, You have only burned 1186 calories and travelled 0 steps, You should exercise for at least 20 more minutes "
    }
  }
}

# RaspBerry PI Client :

To execute polly client Format is :
'node ./polly.js --text="Good Evening"'

To execute lex client :
node /home/pi/lex/lextest/lex.js

lex.js uses sox utility to detect silence after speech utterance and completes the sentence ,after that text is posted to Lex Server.
Preconditions : ALSA and Pulse Audio should be installed to use SOX .

# live-object-dectector.py:
Uses Opencv application and gets inference from Intel Movidius on person detection .Then image is immediatedly captured by Opencv application and sent for analysis.


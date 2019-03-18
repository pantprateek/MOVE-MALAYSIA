
/********************************************************************lex.js******************************************************************************
***This is the lex client which uses sox utility to indentify a sentence and post it to lex server ,it also plays the response from lex server**********/

var AWS = require('aws-sdk');
var fs = require('fs');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;

let credentials = new AWS.SharedIniFileCredentials({profile: 'default'});

   AWS.config.credentials = credentials;
   var FULFILLED = 'Fulfilled',
   RESPONSE_FILE = '/home/pi/lex/lextest/response.mp3',
   REMOVE_REQUEST_FILE = 'rm /home/pi/lex/lextest/request.wav',
   SOX_COMMAND = 'sox -d -t wavpcm -c 1 -b 16 -r 16000 -e signed-integer --endian little - silence 1 0 1% 8 0.3t 2% > /home/pi/lex/lextest/request.wav',
   streaming = false,
   inputStream,
   lexruntime = new AWS.LexRuntime({
     region: 'us-east-1',
     apiVersion: '2016-11-28',
     clientSideMonitoring: true
   });

var setupStream = function() {
   streaming = true;
   console.log("Inside Set up stream\n"); 
   inputStream = fs.createReadStream('/home/pi/lex/lextest/request.wav');
    var params = {
     botAlias: 'mybot',
     botName: 'mybot',
     userId: 'lexHeadTesting',
     contentType: 'audio/l16; rate=16000; channels=1',
     inputStream: inputStream
   };


   lexruntime.postContent(params, function(err, data) {

    console.log("data is " ,data );
     if (err) {
       console.log(err, err.stack);
       process.exit(1);
     } 
      else if(data.intentName== 'music' && data.dialogState == FULFILLED)
      {
              exec('play  /home/pi/lex/lextest/music.mp3 &');
              exec('curl -X POST https://maker.ifttt.com/trigger/lights/with/key/VT12ELAuOosBU1L7nYWYm');
            
      }
      else if(data.intentName == 'Bye'  && data.dialogState == FULFILLED )
        {
              streaming = false;
              process.exit(0);
         }
        else if(data.intentName == 'Stop' && data.dialogState == FULFILLED)
        {
               exec(' sudo killall -9 play ');
              
         }
        fs.writeFile(RESPONSE_FILE, data.audioStream, function(err) {
         if (err) {
           return console.log(err);
           process.exit(1);
         }
       });
        if (data.dialogState == FULFILLED){
                exec('play  /home/pi/lex/lextest/response.mp3');
         }
          if (data.dialogState != FULFILLED){
                record();
         }
     
   });
 }

var record = function() {
     execSync('play  /home/pi/lex/lextest/resources/click.mp3');
     execSync(SOX_COMMAND);
     if (!streaming)
        setupStream();

 }

 record();
                    


/*************************************************************imagewatch.js******************************************************************
*This is the client code which sends image to server for face recognition once the person is detected and launches lex and polly clents*******/

const fs = require('fs');
var shell = require('shelljs');
const eventfile = '/tmp/live.jpg';
var flg=0;
const url ="http://ec2-52-77-219-60.ap-southeast-1.compute.amazonaws.com:3000/event";
const  imgpath =  "pic=@/tmp/live.jpg" ;
console.log(`Watching for file changes on /tmp/live.jpg`);

// Load the SDK
const AWS = require('aws-sdk');
const Stream = require('stream');
const Speaker = require('speaker');

// Create an Polly client
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
});

var dateTime = require('node-datetime');
var dt = dateTime.create();
var formatted = dt.format('Y-m-d');
console.log(formatted);

const { exec } = require('child_process');
var execSync = require('child_process').execSync;
execSync('touch /tmp/live.jpg', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});


let busy=0;
let newimage=0;

 fs.watch(eventfile,(event, filename) => {
 //console.log("Entering  function busy state",busy);
  if (filename && event =='change' && !busy) {
   console.log(`${filename} file Changed` );
   busy=1;
   newimage=1;
   console.log("Busy Status is ",busy); 

    if ( shell.exec( 'curl -X POST --form "pic=@/tmp/live.jpg"  "http://ec2-52-77-219-60.ap-southeast-1.compute.amazonaws.com:3000/event "' ).code != 0 ) {
     shell.echo('Cannot upload image file\n');
     console.log("Busy state is 0");
     busy=0;
    }

  var request = require("request");

  request({
  uri: "http://ec2-52-77-219-60.ap-southeast-1.compute.amazonaws.com:3000/identify",
  method: "GET",
  timeout: 10000,
  followRedirect: true,
  maxRedirects: 10
  }, async function(error, response, body) {
    console.log("Playing identification message\n");
   if (body == null) 
   {
      if ( shell.exec('node ./polly.js --text="Cannot identify the individual"').code == 0 ) {
               shell.echo("played audio ",);
               busy=0; 
       }

   }else  {
               console.log("done identification\n");
               var name=body;
               console.log("Person Name", "response****", body);
               execSync('node ./polly.js --text="Good Evening"' + name +'",How was your day today ? "');
               busy=0;
                       //launching chatbot
                         while( 1){
                                  execSync("node /home/pi/lex/lextest/lex.js");
                                  execSync("sleep  1");
                              }                                   
                    
            }
             
    });
  }
});

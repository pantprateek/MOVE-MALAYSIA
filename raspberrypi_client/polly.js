/**********************************************************polly.js******************************************************************************
*This is the polly client which sends the text to Polly sever and plays mp3 response from the server *******************************************/

// Load the SDK
const AWS = require('aws-sdk')
const Stream = require('stream')
const Speaker = require('speaker')
const httpsAgent = require('https').Agent
const keepAliveAgent = new httpsAgent({maxSockets:1, keepAlive:true})
AWS.config.update({
    httpOptions: { agent: keepAliveAgent }
});

const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-west-2'
})

const Player = new Speaker({
  channels: 1,
  bitDepth: 16,
  sampleRate: 16000
})
//console.log("Polly Speaker done\n");

function textToSpeech(text)
{
let params = {
    'Text':  text,
    'OutputFormat': 'pcm',
    'VoiceId': 'Joanna'
}

//console.log("Polly synthesizeSpeech called\n");

Polly.synthesizeSpeech(params, (err, data) => {

    if (err) {
        console.log(err.code)
    } else if (data) {
        if (data.AudioStream instanceof Buffer) {
            // Initiate the source
            var bufferStream = new Stream.PassThrough()
            // convert AudioStream into a readable stream
            bufferStream.end(data.AudioStream)
            // Pipe into Player
            bufferStream.pipe(Player)
        }
    }
 console.log("Polly synthesizeSpeech done \n");   
})
}

var args=require('minimist')(process.argv.slice(2),{string:"text"});
//console.log('Text ' +args.text);
textToSpeech(args.text);

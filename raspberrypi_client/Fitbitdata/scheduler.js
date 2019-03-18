/******************************************************************************scheduler.js**************************************************
 * This scheduler code invokes refresh token calls at the preset time************/


var schedule = require('node-schedule');
 
var rule1 = new schedule.RecurrenceRule();
rule1.minute = 5;
schedule.scheduleJob(rule1, function(fireDate){
  const { exec } = require('child_process');
  exec('curl -k https://127.0.0.1:9000/refresh', (err, stdout, stderr) => {
  if (err) {
    console.log( "node couldn't execute the command");
    return;
  }

  // the *entire* stdout and stderr (buffered)
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});
  console.log('Refresh Token Executed !',fireDate);
});


//var j = schedule.scheduleJob("*/1 * * *", function(fireDate)
var rule2 = new schedule.RecurrenceRule();
rule2.minute = 10;

schedule.scheduleJob(rule2, function(fireDate){

  const { exec } = require('child_process');
  exec('curl -k https://127.0.0.1:9000/update/activities', (err, stdout, stderr) => {
  if (err) {
    console.log( "node couldn't execute the command");
    return;
  }

  // the *entire* stdout and stderr (buffered)
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});
  console.log('Update Activities Executed !',fireDate);
});


var rule3 = new schedule.RecurrenceRule();
rule3.minute = 30;
schedule.scheduleJob(rule3, function(fireDate){
  const { exec } = require('child_process');
  exec('curl -k https://127.0.0.1:9000/update/leaderboardsteps', (err, stdout, stderr) => {
  if (err) {
    console.log( "node couldn't execute the command");
    return;
  }

  // the *entire* stdout and stderr (buffered)
   console.log(`stdout: ${stdout}`);
   console.log(`stderr: ${stderr}`);
});
   console.log('Update Weekly Steps Executed !',fireDate);
});



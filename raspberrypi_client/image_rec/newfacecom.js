/********************************************************newfacecom.js******************************************************************************************
 * This script runs webserver to load reference images from a html app,accepts live image and compares with reference images using AWS Rekognition api*/


var request = require('request');
var fs = require('fs');
var AWS = require('aws-sdk');


function doProcess(image,callback) {
    var image;
    var matches =[ ];	
    AWS.config.update({
    region: "us-west-2"
    //endpoint: "http://localhost:8000"
   });
   var recog = new AWS.Rekognition({
    apiVersion: '2016-06-27'
   });
   let params = {};
   var path="./reference"
   path='./reference/'+image;
   console.log("Path is :",path);
   let content = fs.readFileSync("event/live.jpg");
   params.SourceImage = {Bytes: content};
   content = fs.readFileSync(path);
   params.TargetImage = {Bytes: content};
   params.SimilarityThreshold =90.0;

    let faces = new Promise((resolve, reject) => {
        recog.compareFaces(params, function(err, data) {
            if(err) reject(err);
            resolve(data);
            if ( data && data.FaceMatches && data.FaceMatches.length ){
                  if (data.FaceMatches[0]['Similarity'] > 90.0){
                      matches=image.slice(0,-4);
                 };
            }
        });
    });


   return new Promise((resolve, reject) => {

   Promise.all([faces]).then(values => {
            let faces = values[0];
            let result = {
                faces:faces
            }
            resolve({"amazon":result});
            callback(matches);
        });
    });
}

function identify(ctr){
 
  fs.readdir('./reference', function(err, items) { 	  
   for (var i=0; i<items.length; i++) {
     doProcess(items[i],function callback(response){
          console.log("Image match found \n",response);
	   if (response!=null) { return ctr(response) ;}
        });
	   
      };
  });
}

var express =   require("express");
var multer  =   require('multer');
var app         =   express();

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './reference');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});
var upload = multer({ storage : storage}).single('pic');


app.post('/train',function(req,res){
    upload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});

var store =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './event');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});
var imgload = multer({ storage : store}).single('pic');

app.post('/event',function(req,res){
    imgload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});

app.get('/identify',function (req,res){
      identify(function (callback) {
      if (callback !='' ) {
	  console.log("Person Identified:  ",callback);    
	  res.end(callback);
      }
   });
});
    


app.post('/trigger',function(req,res){
     trig(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});


app.post('/reference',function(req,res){
     ref(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});

app.get('/',function(req,res){
      res.sendFile(__dirname + "/index.html");
});



app.listen(3000,function(){
    console.log("Working on port 3000");
});




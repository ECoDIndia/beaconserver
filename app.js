/*
 * Author : Daksh Varshneya
 */

var express = require('express'),
    bodyparser = require('body-parser'),
    ibmbluemix = require('ibmbluemix'),
    ibmpush = require('ibmpush');
var url = require('url');

//configuration for application
var appConfig = {
    applicationId: "c06a6c13-5703-4dfa-94ea-751bcfff71cc",
    applicationRoute: "http://beaconpush.mybluemix.net"
};
var mongo = process.env.VCAP_SERVICES;
var conn_str = "";
if (mongo) {
  var env = JSON.parse(mongo);
  if (env['mongolab']) {
    mongo = env['mongolab'][0]['credentials'];
    if (mongo.uri) {
      conn_str = mongo.uri;
    } else {
      console.log("No mongo found");
    }  
  } else {
    conn_str = 'mongodb://localhost:27017';
  }
} else {
  conn_str = 'mongodb://localhost:27017/test';
}

var MongoClient = require('mongodb').MongoClient;
var db;
MongoClient.connect(conn_str, function(err, database) {
  if(err) throw err;
  db = database;
}); 
// create an express app
var app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
  extended: true
}));

ibmbluemix.initialize(appConfig);
var logger = ibmbluemix.getLogger();

app.use(function(req, res, next) {
	req.ibmpush = ibmpush.initializeService(req);
	req.logger = logger;
	next();
});

var ibmconfig = ibmbluemix.getConfig();

//get context root to deploy your application

var contextRoot = ibmconfig.getContextRoot();
appContext=express.Router();
app.use(contextRoot, appContext);

console.log("contextRoot: " + contextRoot);

// log all requests
app.all('*', function(req, res, next) {
	console.log("Received request to " + req.url);
	next();
});

// create resource URIs
appContext.post('/notifyOtherDevices', function(req,res) {
	var results = 'Sent notification to all registered devices successfully.';

	console.log("Trying to send push notification via JavaScript Push SDK");
	var message = { "alert" : "You got a new notification",
					"url": "http://www.google.com"
	};

	req.ibmpush.sendBroadcastNotification(message,null).then(function (response) {
		console.log("Notification sent successfully to all devices.", response);
		res.send("Sent notification to all registered devices.");
	}, function(err) {
		console.log("Failed to send notification to all devices.");
		console.log(err);
		res.send(400, {reason: "An error occurred while sending the Push notification.", error: err});
	});
});

appContext.get('/getNotification',function(req,res){
	console.log('Request hit');
	var url_parts = url.parse(req.url, true);
	var id = url_parts.query.id;
	console.log(id);
	
	db.collection('beacons').find({beaconId:id}).toArray(function(err,items){
		console.log(items);
		db.collection('meetups').find().toArray(function(err1,items1){
			res.json({'message':items[0]['message'],'meetups':items1});
		});
	});

});
appContext.get('/getMeetups',function(req,res){
	res.json({'meetups':[{'title':'AngularJS','url':'www.google.com'}]});
});

appContext.use('/static', express.static('public'));

app.get('/', function(req, res){
	res.sendfile('public/index.html');
});


	
app.listen(ibmconfig.getPort());
console.log('Server started at port: '+ibmconfig.getPort());

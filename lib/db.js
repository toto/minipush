var redis = require("redis");

function DB(config) {
	this.redis = redis.createClient(config.redis.port, config.redis.host); 
	this.conntected = false;	
	var that = this;
	this.redis.on('connect', function() {
			that.conntected = true;
			console.log("Connected to redis");
	});
	
	
	this.registerToken.bind(this);
	this.getTokens.bind(this);
	this.deleteToken.bind(this);
};

DB.prototype.registerToken = function (identifier, json, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }	
	if (!json.language || json.language.length != 2) { cb("No valid language given"); return }			
	
	console.log("json: ", json);
	
	var key = "token:" + identifier + ":" + json.language;	
	console.log("set token for ", key, " to ", json.token);		
	
	this.redis.sadd(key, json.token, function (err, res) {
		cb(err);		
	});	
};

DB.prototype.deleteToken = function (identifier, language, token, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }	
	if (!token || token.length < 1) { cb("No token given"); return }		
	if (!language || language.length != 2) { cb("No valid language given"); return }		
	
	var key = "token:" + identifier + ":" + language;	
	console.log("delete token for", key, ":", token);		
	
	this.redis.srem(key, token, function (err, res) {
		cb(err);		
	});	
};

DB.prototype.getTokens = function (identifier, language, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		
	if (!language || language.length != 2) { cb("No valid language given"); return }			
	
	var key = "token:" + identifier + ":" + language;
	console.log("get tokens for ", key);	
	
	this.redis.smembers(key, function (err, res) {
		if (err) {
			cb(null, err);
			return
		} 
		
		console.log("consoles: ", res);
		
		cb(res, null);
	});	
};

module.exports = DB;
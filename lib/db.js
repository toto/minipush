var redis = require("redis");
var async = require("async");

function DB(config) {
	this.redis = redis.createClient(config.redis.port, config.redis.host); 
	this.conntected = false;	
	this.redis.on('connect', () => {
			this.conntected = true;
			console.log("Connected to redis");
	});
	
	
	this.VALID_TAG_REGEX = /[^a-zA-Z0-9]/;
	
	this.keyForAllTokens = function (identifier, tag) {
		if (!identifier || identifier.length < 1) { return null; }
		if (!tag || tag.length < 1) { return "tokens:" + identifier; }
		return "tokens:" + identifier + "tag:" + tag; 
	};
	
	this.VALID_TOKEN_REGEX = /[a-fA-F0-9]/;	
	
	this.keyForAllTags = (identifier, token) => {
		if (!identifier || identifier.length < 1 ||
				!token || token.length < 1) { return null; }

		return "tags:" + identifier + ":token:" + token;
	};
	
	
	this.registerToken.bind(this);
	this.getTokens.bind(this);
	this.deleteToken.bind(this);
};

DB.prototype.registerToken = function (identifier, json, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		
	
	let existingTagsKey = this.keyForAllTags(identifier, json.token);
	
	this.redis.smembers(existingTagsKey, (err, res) => {
		if (err) { cb(err); return; }
		
		console.log(identifier, ": Current tags for token", json.token, "(", existingTagsKey ,")", ":", res);
		
		let tagsToDelete = res.filter( tag => json.tags.indexOf(tag) === -1 );
		let tagsToAdd = json.tags.filter( tag => res.indexOf(tag) === -1 );		
		
		// remove token from all tag lists where it was removed by this request
		let deleteTasks = tagsToDelete.map((tag) => {
			return (cb) => {
				console.log(identifier, ": Removing token", json.token, "for tag", tag);
				this.redis.srem(this.keyForAllTokens(identifier, tag), json.token, cb);
			}
		});
		
		// add token to all tag lists where it was added by this request
		let addTasks = tagsToAdd.map((tag) => {
			return (cb) => {
				console.log(identifier, ": Adding token", json.token, "for tag", tag);
				this.redis.sadd(this.keyForAllTokens(identifier, tag), json.token, cb);
			}
		});
		
		let tasks = [ 
			// remove old tags from tag list for token
			(cb) => {
				if (!tagsToDelete || tagsToDelete.length == 0) { cb(null, null); return; }
				this.redis.srem(existingTagsKey, tagsToDelete, cb)
			},
			// Add new tags to tag list for token
			(cb) => {
				if (!tagsToAdd || tagsToAdd.length == 0) { cb(null, null); return; }				
				this.redis.sadd(existingTagsKey, tagsToAdd, cb);
			},
			// Add token to the global token list
			(cb) => {
				this.redis.sadd(this.keyForAllTokens(identifier), json.token, cb);
			}
		];
		tasks = tasks.concat(deleteTasks);
		tasks = tasks.concat(addTasks);
				
		async.parallel(tasks, function (err, results) {
			console.info(identifier, ": Registered token", json.token);
			cb(err);
		});
	});
};

DB.prototype.deleteToken = function (identifier, token, cb) {
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

DB.prototype.getTokens = function (identifier, tags, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		
	if (!language || language.length != 2) { cb("No valid language given"); return }			
	
	
	for (var tag of tags) {}
	
	var key = "token:" + identifier;
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
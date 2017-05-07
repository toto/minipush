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
		return "tokens:" + identifier + ":tag:" + tag; 
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
	this.getTags.bind(this);	
};

DB.prototype.registerToken = function (identifier, json, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		
	
	let existingTagsKey = this.keyForAllTags(identifier, json.token);
	
	this.redis.smembers(existingTagsKey, (err, res) => {
		if (err) { cb(err); return; }
		
		console.log(identifier, ": Current tags for token", json.token, "(", existingTagsKey ,")", ":", res);
		
		
		let multi = this.redis.multi();
		
		let tagsToDelete = res.filter( tag => json.tags.indexOf(tag) === -1 );
		let tagsToAdd = json.tags.filter( tag => res.indexOf(tag) === -1 );		
		console.log(identifier, ": Adding", tagsToAdd.length, "tags for", json.token);
		console.log(identifier, ": Removing", tagsToDelete.length, "tags for", json.token);		
		// remove token from all tag lists where it was removed by this request
		for (let tag of tagsToDelete) {
			// console.log(identifier, ": Removing token", json.token, "for tag", tag);
			multi.srem(this.keyForAllTokens(identifier, tag), json.token);
		}
		
		// add token to all tag lists where it was added by this request
		for (let tag of tagsToAdd) {
			let key = this.keyForAllTokens(identifier, tag);	
			// console.log(identifier, ": Adding token", json.token, "for tag", tag, "key", key);
			multi.sadd(key, json.token);
		}

		// remove old tags from tag list for token			
		if (tagsToDelete && tagsToDelete.length > 0) { 
			multi.srem(existingTagsKey, tagsToDelete);
		}
		
		// Add new tags to tag list for token
		if (tagsToAdd && tagsToAdd.length > 0) {
			multi.sadd(existingTagsKey, tagsToAdd);
		}		
		
		// Add token to the global token list		
		multi.sadd(this.keyForAllTokens(identifier), json.token);
		
		multi.exec((err, replies) => {
			console.info(identifier, ": Registered token", json.token);
			console.info(replies);			
			if (err) console.error(err);
			cb(err);
		});
	});
};

DB.prototype.deleteToken = function (identifier, token, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }	
	if (!token || token.length < 1) { cb("No token given"); return }		
	
	let existingTagsKey = this.keyForAllTags(identifier, token);
	
	this.redis.smembers(existingTagsKey, (err, res) => {
		if (err) { cb(err); return }
		
		// Remove token from the tag lists it's in
		let deleteTasks = res.map((tag) => {
			return (cb) => {
				console.log(identifier, ": Removing token", token, "for tag", tag);
				this.redis.srem(this.keyForAllTokens(identifier, tag), token, cb);
			}
		});
		// Remove tag list for this token
		deleteTasks.push((cb) => {
				if (res.length == 0) { cb(null, null); return; }
				this.redis.srem(existingTagsKey, res, cb)
		});
		// Remove token	from global list
		deleteTasks.push((cb) => {
				if (res.length == 0) { cb(null, null); return; }
				this.redis.srem(this.keyForAllTokens(identifier), token, cb)
		});
		
		async.parallel(deleteTasks, (err, res) => {
				console.log(identifier, "delete token", token);		
				cb(err);		
		});
	})	
};

DB.prototype.getTokens = function (identifier, tags, cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		

	let keys = [this.keyForAllTokens(identifier)]

	if (tags && tags.length > 0) {
		keys = keys.concat(tags.map( tag => this.keyForAllTokens(identifier, tag) ));
	}

	this.redis.sinter(keys, function (err, res) {
		if (err) { cb(err); return; } 
		
		console.log(identifier, "tokens:", res, "for tags", tags);
		
		cb(null, res);
	});	
};

DB.prototype.getTags = function(identifier, cursor = "0", cb) {
	if (!this.conntected) { cb("Not connected to database"); return }
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }		
	
	let pattern = "tokens:" + identifier + ":tag:";
	let queryPattern = pattern + "*";
	this.redis.keys(queryPattern, (err, res) => {
		if (err) { cb(err, null); return; }
		
		console.info("We have", res.length, "tags:", err, res);
		
		let countTasks = res.map( (key) => {
			let tag = key.replace(pattern, "");
			return (cb) => {
				this.redis.scard(key, (err, res) => { cb(err, [tag, res]) });
			};
		});
		
		async.parallel(countTasks, (err, res = []) => {
			if (err) console.error(err);
			cb(err, res.map( (tag) => {
				return {tag: tag[0],
							  count: tag[1]};
			}));			
		});
	});
};

module.exports = DB;
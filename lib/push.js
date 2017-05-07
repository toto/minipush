let apn = require('apn');
let config = require("../config.json");
let async = require('async');

function Push(db) {
	
	var scopeTokensForIdentifier = {};
	var bundleIdForIdentifier = {};	
	var apnForApp = {};
	for (app of config.applications) {
		var provider = new apn.Provider({
			"token": config.token,
			"production": !app.sandbox
		});
		apnForApp[app.identifier] = provider;
		bundleIdForIdentifier[app.identifier] = app.bundleId;
		
		var scopeTokens = {};
		for (access of app.access) {
			for (scope of access.scopes) {
				var tokens = scopeTokens[scope];
				if (!tokens) tokens = [];
				tokens.push(access.token);
				scopeTokens[scope] = tokens;
			}
		}
		scopeTokensForIdentifier[app.identifier] = scopeTokens;
	}
	
	this.scopeTokensForIdentifier = scopeTokensForIdentifier;
	this.bundleIdForIdentifier = bundleIdForIdentifier;
	this.apn2app = apnForApp;
	this.db = db;
	this.VALID_TOKEN_REGEX = /^[0-9A-F]+$/gi;
	this.validTags = (tags) => {
		if (!tags) return true;
		if (!Array.isArray(tags)) return false;
		
		let VALID_TAG_REGEX = /^[A-Z0-9_\-]+$/gi;	
		
		for (let tag of tags) {
			if (tag.match(VALID_TAG_REGEX) === null) {
				return false;
			}
		}
		return true;
	}
	
	this.registerToken.bind(this);
	this.deleteToken.bind(this);	
	this.sendMessages.bind(this);
	this.accessTokenValid.bind(this);
	this.getTags.bind(this);
};

Push.prototype.accessTokenValid = function(identifier, scope, accessToken) {
	var scopes = this.scopeTokensForIdentifier[identifier];
	if (!scopes) return false;
	var tokens = scopes[scope];
	return tokens.indexOf(accessToken) != -1;
};

Push.prototype.deleteToken = function (identifier, token, cb) {
	if (!identifier || identifier.length < 1) { cb("No identifier given"); return }	
	if (!token || token.length < 1) { cb("No token given"); return }		
	
	this.db.deleteToken(identifier, token, cb);
};

Push.prototype.registerToken = function(identifier, json, cb) {
	if (!identifier || identifier.length < 1) { cb("Invalid identifier"); return; }	
	if (!json) { cb("No JSON sent"); return; }
	if (!json.token || typeof( json.token ) !== "string") { cb("token missing"); return; }
	if (!json.token.match(this.VALID_TOKEN_REGEX)) { cb("token invalid"); return; }
	if (!this.validTags(json.tags)) { cb("invalid tags"); return; }
	
	this.db.registerToken(identifier, json, cb);
};

Push.prototype.sendMessages = function(identifier, json, cb) {
	if (!identifier || identifier.length < 1) { cb("Invalid identifier"); return; }	
	var bundleId = this.bundleIdForIdentifier[identifier];
	if (!bundleId || bundleId.length < 1) { cb("bundleId not configured for this identifier"); return; }		
	if (!json) { cb("No JSON sent"); return; }	
	var notificationService = this.apn2app[identifier];
	if (!notificationService) { cb("No push application configured in config.json for", identifier); return; }
	if (!this.validTags(json.tags)) { cb("Invalid tags"); return; }

	this.db.getTokens(identifier, json.tags, (err, tokens) => {
		if (err) { cb(err); return; }
		console.log("Sending messages to", json.language, "with", tokens.length, "devices.");
		
		var notificationJson = json;
		delete notificationJson.language;
		let notification = new apn.Notification(notificationJson);
		notification.topic = bundleId;
		
		notificationService.send(notification, tokens).then( (response) => {
			response.failed
			console.log("Sent", tokens.length, "messages", "(failed: ", response.failed, ", success:", response.success, ")");

			cb(null);			
		});
	});	
};

Push.prototype.getTags = function(identifier, cursor = "0", cb) {
	if (!identifier || identifier.length < 1) { cb("Invalid identifier"); return; }	
	if (typeof( cursor) !== "string") { cb("Invalid cursor"); return; }	
	
	this.db.getTags(identifier, cursor, cb);
};


module.exports = Push;
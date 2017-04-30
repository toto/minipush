var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var DB = require('./db');
var Push = require('./push');
var config = require("../config.json");
var db = new DB(config);
var push = new Push(db);

router.use(bodyParser.json());

function replyError(res, statusCode, errorMessage) {
	var statusMessage;
	switch (statusCode) {
	case 404:
		statusMessage = "Not Found";
		break;
	case 406:
		statusMessage = "Not Acceptable";
		break;	
	case 401:
		statusMessage = "Unauthorized";
		break;				
	default:
		statusCode = 500;
		statusMessage = "Internal Server Error";
	}
	
	res.statusMessage = statusMessage;
	res.statusCode = statusCode;
	res.json({error: {message: errorMessage}});
}

function replySuccess(res, data) {
	res.json({data: data});
}

function validateAccessToken(validScope, identifier, req, res) {
	if (!identifier) {
		replyError(res, 406, "Invalid Request");				
		return false;
	}
	var header = req.headers.authorization;
	if (!header) {
		replyError(res, 401, "Missing access token");				
		return false;
	}
	
	var split = header.split(" ");
	var bearer = split[0];		
	if (bearer != "Bearer") {
		replyError(res, 401, "Invalid access token");		
		return false;
	}
	
	var token = split[1];	
	if (!push.accessTokenValid(identifier, validScope, token)) {
		replyError(res, 401, "Invalid access token");
		return false;
	}

	return true;
}

// Register Devices
router.post('/token/:identifier', function (req, res) {	
	var identifier = req.params.identifier;
	if (!validateAccessToken("register", identifier, req, res)) return;
		
	var json = req.body;
	
	push.registerToken(identifier, json, function (err) {
		if (err) {
			replyError(res, 406, err);
			return;
		}
		replySuccess(res, json);
	});
});

// Delete registered device
router.delete('/token/:identifier', function (req, res) {		
	var identifier = req.params.identifier;
	if (!validateAccessToken("register", identifier, req, res)) return;
		
	var token = req.query.token;
	var language = req.query.language;	

	if (!identifier || identifier.length < 1) { replyError(res, 406, "identifier missing"); return; }	
	if (!token || token.length < 1) { replyError(res, 406, "token missing"); return; }
	if (!language || language.length != 2) { replyError(res, 406, "language missing"); return; }	
	
	push.deleteToken(identifier, language, token, function (err) {
		if (err) {
			replyError(res, 406, err);
			return;
		}
		replySuccess(res, {"token": token, "language": language});
	});
});

// Send message 
router.post('/message/:identifier', function (req, res) {
	var identifier = req.params.identifier;
	if (!validateAccessToken("publish", identifier, req, res)) return;
	
	var json = req.body;

	push.sendMessages(identifier, json, function (err) {
		if (err) {
			replyError(res, 406, err);
		}
		replySuccess(res, json);		
	});
});

module.exports = router;

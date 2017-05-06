# minipush

`minipush` is a simple, API-only push notification server for sending notifications to iOS devices.

## Installation

You need a redis server running.

1. Clone the repo
2. `npm install`
3. `cp config-example.json config.json`
4. `node minipush.js`

## Configuration

minipush is configured via the `config.json` file. 

### Redis

Configure `port` and `host` of your redis server.

### Token

minipush only supports [Provider Authentication Tokens](https://github.com/node-apn/node-apn/blob/master/doc/apn.markdown#provider). You need to generate an APNS token (p8-file) in the Developer Portal. You also need to set your team id and key id. [More info](https://github.com/node-apn/node-apn/blob/master/doc/provider.markdown).


### Applications

You define one or more applications to send token to. Each application has a `identifier` and a `bundleId`. 

- `identifier` (String) is the application identifier. Must be uniq.
- `bundleId` (String) is the bundle id of your app. Multiple applications can share the same bundle id. This is usefull when having a sandbox app.
- `sandbox` (Bool, optional) if `true` the sandbox environment is used when sending notifications to this application.


### API

####  Registrations

```
POST /api/tokens/[identifier]

Authorization: Bearer 7777e7568695fe1638a1f8f4e3e08ac8dc9131d2

{"token": "2342badcaffee425918",
 "tags": ["en"]}
```

#### De-Register

```
DELETE /api/tokens/[identifier]?token=2342badcaffee425918

Authorization: Bearer 7777e7568695fe1638a1f8f4e3e08ac8dc9131d2
```

#### Send messages

The `tags` property determines where the push messages are sent. If it is omnited or empty the message is to _all_ registered devices.

```
POST /api/message/[identifier]

Authorization: Bearer 32698b262bf107767a87cd2d72624172461a7392

{
	"tags": ["en"],
	"title": "Title",
	"badge": 23,	
	"sound": "default",
	"body": "Message text can be longer",
	"payload": {
		"url": "https://github.com", 
		"foo": "bar"
	}
}
```

## License

MIT, see [LICENSE](LICENSE)

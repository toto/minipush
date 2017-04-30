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

## License

BSD see [LICENSE](LICENSE)

let express = require('express');
let app = express();
let api = require('./lib/api');
let config = require('./config.json');

app.use('/api', api);

let hostConfig = config.http;

app.listen(hostConfig.port, hostConfig.host, () => {
  console.log('minipush listening on', "http://" + hostConfig.host + ":" + hostConfig.port);
});
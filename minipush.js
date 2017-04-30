let express = require('express');
let app = express();
let api = require('./lib/api');
let config = require('./config.json');

app.use('/api', api);

app.listen(3000, "::", () => {
  console.log('ocpush listening on port 3000');
});
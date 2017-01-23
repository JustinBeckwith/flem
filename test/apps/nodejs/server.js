var express = require('express')
var app = express();
app.get('/', function (req, res) {
  res.send('go-steelers');
});

app.get('/env', function (req, res) {
  res.send(JSON.stringify(process.env));
});

let server = app.listen(process.env.PORT || 3000, () => {
  const port = server.address().port;
  console.log(`App listening on port ${port}`);
});
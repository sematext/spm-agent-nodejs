var spmAgent = require ('../lib/index.js')  // or 'spm-agent-nodejs'
spmAgent.on ('stats', console.log)
spmAgent.on ('metric', function () {
  if (metric.name === 'http')
    console.log (metric)
})

var http = require ('http')
http.createServer (function (req, res) {
    res.end ('Hello World')
}).listen (8080)


var spmAgent = require ('../lib/index.js')  // or 'spm-agent-nodejs'
spmAgent.on ('stats', function (stats) {
  console.log (stats)
} )
spmAgent.on ('metric', function (metric) {
  //if (metric.name === 'http')
  //  console.log (metric)
})

var http = require ('http')
http.createServer (function (req, res) {
    res.end ('Hello World')
}).listen (8080)


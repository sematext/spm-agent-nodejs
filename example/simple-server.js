var spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'
spmAgent.on('stats', function (stats) {
  console.log('\nStats\n')
  console.log(stats)
  console.log('\n---------------------------------------------------\n')
})
spmAgent.on('metric', function (metric) {
  console.log('\nMetric\n')
  // console.log(metric.measurement === 'docker')
  if (metric.measurement === 'docker') {
    console.log(metric)
  }
  console.log('\n---------------------------------------------------\n')
})

var http = require('http')
http.createServer(function (req, res) {
  res.end('Hello World')
}).listen(3000)

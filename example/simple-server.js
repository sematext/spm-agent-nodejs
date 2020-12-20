var spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'
spmAgent.on('stats', function (stats) {
  // console.log('\nStats\n')
  // console.log(stats)
  // console.log('\n---------------------------------------------------\n')
})
spmAgent.on('metric', function (metric) {
  // console.log('\nMetric\n')
  // console.log(process.env.isDocker)
  // console.log(process.env.containerId)
  // console.log(process.env.containerName)
  // console.log(process.env.containerImage)
  // console.log(metric)

  // if (metric.measurement === 'docker') {
  //   console.log(metric)
  // }
  // console.log('\n---------------------------------------------------\n')
})

var http = require('http')
http
  .createServer(function (req, res) {
    res.end('Hello World')
  })
  .listen(3000)

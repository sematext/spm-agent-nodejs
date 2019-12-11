const spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'

spmAgent.on('stats', function (stats) {
  // console.log(stats)
})
spmAgent.on('metric', function (metric) {
  if (metric && metric.fields !== undefined &&
    (metric.fields.processes ||
    metric.fields.numWorkers)
  ) {
    console.log(metric)
  }
})

const { resolve } = require('path')
const { fork } = require('child_process')
const http = require('http')
http.createServer(function (req, res) {
  const longComputation = fork(resolve(__dirname, 'longComputation.js'))
  longComputation.send('start')
  longComputation.on('message', sum => {
    res.end(String(sum))
    longComputation.send('stop')
  })
}).listen(3000)

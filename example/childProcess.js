const spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'
spmAgent.on('stats', function (stats) {
  // console.log(stats)
})
spmAgent.on('metric', function (metric) {
  // if (metric.name === 'http') {
  // if (metric.name === 'numWorkers') {
  // if (metric.sct === 'APP') {
  if (
    metric.name === 'process' ||
    metric.name === 'numWorkers'
  ) {
    console.log(metric)
  }
})

// if (process.send === undefined) {
//   console.log('started directly')
// } else {
//   console.log('started from fork()')
// }

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

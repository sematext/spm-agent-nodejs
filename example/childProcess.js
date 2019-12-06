const spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'
const pidusageTree = require('pidusage-tree')

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

/* setInterval(() => {
  pidusageTree(process.pid, function (err, results) {
    if (err) {
      return console.error(err)
    }
    console.log(process.pid, results)
  })
}, 1000) */

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

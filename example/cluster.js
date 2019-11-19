const spmAgent = require('../lib/index.js') // or 'spm-agent-nodejs'

const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const http = require('http')
const port = 3000

if (process.send === undefined) {
  console.log('started directly')
} else {
  console.log('started from fork()')
}

const masterProcess = () => {
  console.log(`Master running on port ${port} with pid ${process.pid}`)

  /**
   * Agent Tests
   */
  spmAgent.on('stats', function (stats) {
    // console.log(stats)
  })
  spmAgent.on('metric', function (metric) {
    if (
      // metric.name === 'process' ||
      metric.name === 'numWorkers'
    ) {
      console.log(metric)
    }
  })

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
    cluster.on('exit', (worker) => cluster.fork())
  }
}
const childProcess = () => {
  /**
   * Agent Tests
   */
  spmAgent.on('stats', function (stats) {
    // console.log(stats)
  })
  spmAgent.on('metric', function (metric) {
    if (
      // metric.name === 'process' ||
      metric.name === 'numWorkers'
    ) {
      console.log(metric)
    }
  })

  console.log(`Worker${cluster.worker.id} running on port ${port} with pid ${cluster.worker.process.pid}`)
  http.createServer(function (req, res) {
    res.end('Hello World')
  }).listen(port)
}

if (cluster.isMaster) {
  masterProcess()
} else {
  childProcess()
}

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

// if (process.send === undefined) {
//   console.log('started directly')
// } else {
//   console.log('started from fork()')
// }

const longComputation = () => {
  let sum = 0
  for (let i = 0; i < 1e10; i++) {
    sum += i
  }
  return sum
}

process.on('message', (msg) => {
  const sum = longComputation()
  process.send(sum)
})

process.on('message', msg => {
  if (msg === 'stop') {
    process.exit()
  }
})

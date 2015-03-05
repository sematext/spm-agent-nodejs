var SpmAgent = require ('spm-agent')

function NodeJSAgent()
{
   var njsAgent = new SpmAgent()
   var agentsToLoad = [
    './eventLoopAgent.js',
    './gcAgent.js',
    './osAgent.js',
    './httpServerAgent.js'
  ]
  agentsToLoad.forEach (function (a) {
    var Monitor = require (a)
    njsAgent.createAgent(new Monitor())
  })
  return njsAgent
}

module.exports = NodeJSAgent()
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
    try {
      var Monitor = require (a)
      njsAgent.createAgent(new Monitor())
    } catch (err) {
        SpmAgent.Logger.error (err)
    }
  })
  return njsAgent
}

module.exports = NodeJSAgent()
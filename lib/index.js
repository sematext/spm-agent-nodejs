/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
var SpmAgent = require('spm-agent')

function NodeJSAgent () {
  // prepare move from SPM_TOKEN to MONITORING_TOKEN + backward compatibility
  if (process.env.SPM_TOKEN && !SpmAgent.Config.tokens.spm) {
    SpmAgent.Config.tokens.spm = process.env.SPM_TOKEN
    SpmAgent.Config.tokens.monitoring = process.env.SPM_TOKEN
  }
  if (process.env.MONITORING_TOKEN && !SpmAgent.Config.tokens.monitoring) {
    SpmAgent.Config.tokens.spm = process.env.MONITORING_TOKEN
    SpmAgent.Config.tokens.monitoring = process.env.MONITORING_TOKEN
  }
  if (process.env.INFRA_TOKEN && !SpmAgent.Config.tokens.infra) {
    SpmAgent.Config.tokens.infra = process.env.INFRA_TOKEN
  }
  var njsAgent = new SpmAgent()
  var agentsToLoad = [
    './eventLoopAgent.js',
    './gcAgent.js',
    'spm-agent-os',
    './httpServerAgent.js',
    './processAgent.js',
    './workerAgent.js'
  ]
  agentsToLoad.forEach(function (a) {
    try {
      var Monitor = require(a)
      njsAgent.createAgent(new Monitor())
    } catch (err) {
      console.error(err)
      SpmAgent.Logger.error('Error loading agent ' + a + ' ' + err)
    }
  })
  return njsAgent
}

module.exports = NodeJSAgent()

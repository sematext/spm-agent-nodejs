#!/usr/bin/env node
/*
 * @copyright Copyright (c) Sematext Group, Inc. - All Rights Reserved
 *
 * @licence SPM for NodeJS is free-to-use, proprietary software.
 * THIS IS PROPRIETARY SOURCE CODE OF Sematext Group, Inc. (Sematext)
 * This source code may not be copied, reverse engineered, or altered for any purpose.
 * This source code is to be used exclusively by users and customers of Sematext.
 * Please see the full license (found in LICENSE in this distribution) for details on its license and the licenses of its dependencies.
 */
var fs = require('fs')
var os = require('os')
var path = require('path')

var monitoringToken = ''
var infraToken = ''

if (process.argv.length < 3) {
  if (!(process.env.SPM_TOKEN || process.env.MONITORING_TOKEN) ||
      !process.env.INFRA_TOKEN) {
    console.log('Usage: spmconfig.js YOUR_NODE_APP_TOKEN YOUR_INFRA_TOKEN')
  }
}

if (process.argv.length > 2) {
  monitoringToken = process.argv[2]
}

if (process.argv.length > 3) {
  infraToken = process.argv[3]
} else {
  console.log('Usage: spmconfig.js YOUR_NODE_APP_TOKEN YOUR_INFRA_TOKEN')
  process.exit(0)
}

if (process.env.SPM_TOKEN) { monitoringToken = process.env.SPM_TOKEN }
if (process.env.MONITORING_TOKEN) { monitoringToken = process.env.MONITORING_TOKEN }
if (process.env.INFRA_TOKEN) { monitoringToken = process.env.SPM_TOKEN }

var useLinuxAgent = 'false'
if (os.platform() === 'linux') {
  useLinuxAgent = 'true'
}
var cfgLines = [
  "# Please don't change this configuration",
  '# Directory for buffered metrics',
  'useLinuxAgent: ' + useLinuxAgent,
  `dbDir: ${path.join(process.cwd(), 'spmdb')}`,
  ' ',
  '# SPM_MONITOR_TAGS=project:frontend,environment:test,role:testserver',
  '# Application Token for SPM',
  'tokens:',
  `  spm: ${monitoringToken}`,
  `  monitoring: ${monitoringToken}`,
  `  infra: ${infraToken}`,
  ' ',
  'logger:',
  '  # log file directory default is __dirname / spmlogs',
  `  dir: ${path.join(process.cwd(), 'spmlogs')}`,
  '  # silent = true means no creation of log files',
  '  silent: false ',
  '  # log level for output - debug, info, error, defaults to error to be quiet',
  '  level: error '
]
var cfgFileContent = cfgLines.join('\r\n')
fs.writeFileSync('.spmagentrc', cfgFileContent)
console.log('Create default config to file: ./.spmagentrc \n' + cfgFileContent)

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
//"use strict";
var fs = require('fs')
var path = require('path')


try {
  var script = fs.readFileSync(process.argv[2]).toString()
  if (process.argv.length < 2) {
    console.log('Please specify a node.js script to run with activated SPM agent')
    console.log('e.g. spmmonitor ./server/app.js')
  }
  var scriptName = process.argv[2]
  var SpmAgent = require('spmagent')
  var agent = new SpmAgent()
  //Remove Arguments for Runner Script, to give started process a clean ENV
  process.argv.splice(1, 1);
  process.argv.splice(2, 1);
  var script = fs.readFileSync(scriptName).toString()
  var lines = script.split('\n')
  if (lines[0] && /\#!/.test(lines[0])) {
    console.log('removed shebang line:' + lines[0])
    lines [0] = '\n'
  }
  eval(lines.join('\n'))

} catch (err) {
  console.error(err)
  process.exit(1)
}



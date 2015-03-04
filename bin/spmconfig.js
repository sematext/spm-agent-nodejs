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
var config = require ('spm-agent').Config
var fs = require ('fs')
delete config._
delete config.rcFlat
delete config.config
delete config.agentsToLoad

if (process.argv.length == 3){
	config.tokens.spm = process.argv[2]
	console.log (process.argv[2]) 
}

if (process.env.SPM_TOKEN)
		config.tokens.spm = process.env.SPM_TOKEN


fs.writeFileSync ('.spmagentrc', JSON.stringify (config, null, '\t'))
console.log ('Create default config to file: ./.spmagentrc \n' + JSON.stringify  (config, null, '\t'))


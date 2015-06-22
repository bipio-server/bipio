#!/usr/bin/env node

require('coffee-script').register()
fs = require('fs-sync')
path = require('path')
pkg = require(path.join(__dirname, './package.json'))
colors = require('colors')

// Are there keys?
try { 
	var keys = require('./config/keys')
}
// No? End the process, workers can't do installs.
catch (error) {
	done("Bipio API must be installed for a worker process to run.".red, 1)
}
// Yes? Great, let's start Bipio Worker!
if (keys) require("./server/index.litcoffee")({worker: true})

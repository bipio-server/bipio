#!/usr/bin/env node

require('coffee-script').register()
fs = require('fs-sync')
path = require('path')
pkg = require(path.join(__dirname, './package.json'))
colors = require('colors')
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

done = function (exitmsg) {
	if (exitmsg) console.log("[Bipio]".cyan, exitmsg)
	process.exit(0)
}

if (process.argv[2]) {
	if (process.argv[2][0] === '-') {
		switch (process.argv[2]) {
			case '-v':
				done("v"+pkg.version)
		}
	}
	else if (fs.exists(__dirname+"/commands/"+process.argv[2]+".litcoffee")) require("./commands/"+process.argv[2]+".litcoffee")(process.argv, done) 
	else console.log("Not a valid parameter.")
}
else {
	module.exports = require('./server/index.litcoffee')()
}
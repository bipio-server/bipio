## `test` command handler

	fs = require 'fs'
	fs_sync = require 'fs-sync'
	path = require 'path'
	exec = require('child_process').exec
	spawn = require('child_process').spawn
	pkg = require(path.join(__dirname, '../package.json'))
	Mocha = require 'mocha'
	mocha = new Mocha
	testOptions = {
		console: false
	}

	module.exports = (args, end) ->

		for el, i in args
			testOptions[args[i].replace('--', '')] = true if i > 2 and testOptions.hasOwnProperty args[i].replace('--', '')
		
		# Set test options. Only 'console' is available right now.
		fs.writeFile path.join(__dirname, '../test/config.json'), JSON.stringify(testOptions, null, 4), (err) ->
			
			testTarget = path.join __dirname, '../test'
			
			if args[3]
				folderPath = path.join __dirname, "../test/#{args[3]}"
				try 
					fs.lstatSync(folderPath)
				catch error
					end "Folder `#{args[3]}` does not exist in 'test'".red
				
				if fs.lstatSync(folderPath).isDirectory()
					mocha.addFile path.join(folderPath, file) for file in fs.readdirSync folderPath

			else
				for folder in fs.readdirSync testTarget
					folderPath = path.join __dirname, "../test/#{folder}"
					if fs.lstatSync(folderPath).isDirectory()
						mocha.addFile path.join(folderPath, file) for file in fs.readdirSync folderPath

Run Mocha tests.

			mocha.run (failures) ->
				process.on 'exit', () ->
					process.exit failures
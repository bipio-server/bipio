#### Start

Command handler for `bipio start` command

	fs = require 'fs'
	pm2 = require('pm2')
	path = require 'path'
	spawn = require('child_process').spawn
	pkg = require(path.join(__dirname, '../package.json'))
	colors = require 'colors'
	os = require 'os'

	module.exports = (args, end) ->

		environment = 'development'

Detect/assign environment

		if process.env.NODE_ENV?
			environment = process.env.NODE_ENV
		else if args[3]?
			environment = args[3]
		else console.warn "[Bipio]".cyan , "[Warning] No environment specified, assuming `development` by default".yellow

Start the app. This function will be invoked later.

		start = () ->

In a development environment, we just spawn a child `gulp` process and pipe its' output to `process.stdout` (i.e. the Terminal).  

			if environment is 'development'
				server = spawn "gulp"
				server.stdout.pipe(process.stdout) 
				server.stderr.pipe(process.stderr)

In a production environment, things get more real.  

			if environment is 'production'

				limit = os.cpus().length / 2

				processes =
					main: []
					worker: []
				
				options = 
					main: { name: "bipio", instances: limit }
					worker: { name: "bipio_worker", instances: limit }

				scripts = 
					main: path.join __dirname, "../index.js"
					worker: path.join __dirname, "../worker.js"

First we use PM2 to see what processes are running, if any.

				pm2.connect (err) ->
					end err if err

					pm2.list (err, list) ->
						end err if err
						processes.main.push proc for proc in list when proc.name is "bipio"
						processes.worker.push proc for proc in list when proc.name is "bipio_worker"

If there is a process of the same type, check to see if the max processes are running. If not, spin them up.

						if processes.main.length < limit
							options.main.instances = limit - processes.main.length
							console.log "Max main instances not reached, spinning up #{options.main.instances} main processes."
							
							pm2.start scripts.main, options.main, (err, proc) ->
								end err if err
								console.log "Successfully spun up #{options.main.instances} main processes"

								if processes.worker.length < limit
									options.worker.instances = limit - processes.worker.length
									console.log "Max worker instances not reached, spinning up #{options.worker.instances} worker processes."
									
									pm2.start scripts.worker, options.worker, (err, proc) ->
										end err if err
										console.log "Successfully spun up #{options.worker.instances} worker processes"

										pm2.disconnect () ->
											end "Bipio production API cluster is up, using max CPU threads.".green

		start()

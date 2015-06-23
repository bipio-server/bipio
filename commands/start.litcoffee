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

In a development environment, we just spawn a `gulp` process and pipe its output to `process.stdout` (i.e. the Terminal).  

			if environment is 'development'
				server = spawn "gulp"
				server.stdout.pipe(process.stdout) 
				server.stderr.pipe(process.stderr)

In a production environment, things get more real.  

			if environment is 'production'
				console.log "Production"
				limit = os.cpus().length / 2

				processes =
					owner: []
					worker: []
				
				options = 
					owner: { name: "bipio", instances: limit }
					worker: { name: "bipio_worker", instances: limit }

				scripts = 
					owner: path.join __dirname, "../index.js"
					worker: path.join __dirname, "../worker.js"

First we use PM2 to see what processes are running, if any.

				pm2.connect (err) ->
					end err if err

					pm2.list (err, list) ->
						end err if err

If there is a process of the same type, check to see if the max processes are running. If not, spin them up.

						processes.owner.push proc for proc in list when proc.name is "bipio"
						processes.worker.push proc for proc in list when proc.name is "bipio_worker"

						spinWorkers = () ->
							if processes.worker.length < limit
								options.worker.instances = limit - processes.worker.length
								console.log "[Bipio]".cyan, "Only #{processes.worker.length} worker processes out of #{limit} possible CPUs, spinning up repmaining #{options.worker.instances} worker processes.".yellow
								
								pm2.start scripts.worker, options.worker, (err, proc) ->
									end err if err
									console.log "[Bipio]".cyan, "Successfully spun up #{options.worker.instances} worker processes"

									pm2.disconnect () ->
										end "Bipio production API cluster is up, using max CPU threads.".green
							else
								end "Max #{limit} worker processes already up, skipping...".yellow

						spinOwners = () ->
							if processes.owner.length < limit
								options.owner.instances = limit - processes.owner.length
								console.log "[Bipio]".cyan, "Only #{processes.owner.length} owner processes out of #{limit} possible CPUs, spinning up remaining #{options.owner.instances} owner processes.".yellow
								
								pm2.start scripts.owner, options.owner, (err, proc) ->
									end err if err
									console.log "[Bipio]".cyan, "Successfully spun up #{options.owner.instances} owner processes"
									spinWorkers()
							else
								console.log "[Bipio]".cyan, "Max #{limit} owner processes already up, skipping..."
								spinWorkers()

						spinOwners()

		start()

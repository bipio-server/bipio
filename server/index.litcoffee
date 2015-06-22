Bip.io API Server
===

A place to discover, share, and automate your Internet of Things.  
This is the [Node.js](http://nodejs.org)/[Express](http://expressjs.com/) app powering the server at http://api.bip.io - written in Literate Coffeescript, built using Gulp.  

	Bipio  = (options) ->

Here's where we require our [npm modules](https://npmjs.com).

		express 		= require 'express'
		moment 			= require 'moment'
		path 			= require 'path'
		fs				= require 'fs'
		ip 				= require 'ip'
		colors 			= require 'colors'
		bodyParser 		= require 'body-parser'
		compression 	= require 'compression'
		request 		= require 'request'
		passport 		= require 'passport'
		BasicStrategy 	= require('passport-http').BasicStrategy
		config			= require '../config'
		strategies 		= require '../config/passport'
		pkg				= require '../package.json'
		Database 		= require './utilities/database'
		Bastion 		= require './utilities/bastion'
		models			= {}
		routes 			= {}
		controllers		= {}

Load the models, routes, and controllers from their directories in `server/models/`, `server/routes/`, and `server/controllers/`, respectively. 

		models[model.replace('.litcoffee', '')] = require("./models/#{model.replace('.litcoffee', '')}") for model in fs.readdirSync(path.join(__dirname, "models")) when model isnt 'index.litcoffee'
		routes[route.replace('.litcoffee', '')] = require("./routes/#{route.replace('.litcoffee', '')}") for route in fs.readdirSync(path.join(__dirname, "routes"))
		controllers[controller.replace('.litcoffee', '')] = require("./controllers/#{controller.replace('.litcoffee', '')}") for controller in fs.readdirSync(path.join(__dirname, "controllers"))

Instantiate the global `app` object. `app` will contain the main server instance, as well as other properties we can add as we see fit. 

		app	= express()
		app.options = options
		app.config = config({})
		app.testPort = 5999

Re-route console methods to app, put a timestamp and colors on output

		app.dialog = (str) -> console.log str.green
		app.log = (str) -> console.log "#{moment().format('D MMM YYYY H:mm:ss').bgCyan.black} #{"Info:".cyan} #{str.cyan}"
		app.error = (str) -> console.error "#{moment().format('D MMM YYYY H:mm:ss').bgRed.black} #{"Error:".red} #{str.red}"
		app.warn = (str) -> console.warn "#{moment().format('D MMM YYYY H:mm:ss').bgYellow.black} #{"Warning:".yellow} #{str.yellow}"

		app.kill = () -> process.exit 0

Set the TCP/IP port for the app to listen on. During development it's set at `localhost:5000`.

		if options?.port is app.testPort
			app.set 'port', options.port
		else
			app.set 'port', process.env.BIPIO_API_PORT or app.config.api.port

Attach all to the Express instance.

		app.use compression()
		app.use bodyParser.json()
		app.use bodyParser.urlencoded { extended: true }

Configure models, Bastion, Passport and [RethinkDB](http://rethinkdb.com) middleware.

		app.models = models
		
		app.activeChildren = []
		app.bastion = new Bastion app

		app.passport = passport
		strategies(app)

		app.database = new Database app.config.db

		# TODO pick up all bips marked active and put them on the queue
		app.lastWill = () ->
			app.log "Process #{process.pid} exiting, releasing active bips back to queue..."
			console.log app.activeChildren
			app.bastion.addJob bip for bip in app.activeChildren
			app.dialog "Done!"
			process.exit(1)
		
		#process.on 'exit', app.lastWill
		process.on 'SIGINT', app.lastWill

		app.database.on "ready", (accounts) ->
			# Connected to database

			app.dialog "Database Ready"
			
			if app.get('port') is app.testPort
				app.warn "Disabling HTTP Basic Auth for test environment"
			else
				app.passport.use new BasicStrategy (username, password, done) ->
					console.log "username: #{username}, password: #{password}"
					app.database.get 'account_auths', {username: username}, (err, result) ->
						done err if err
						
						if result is null # TODO match passwords
							done()
						else 
							done null, result

		app.use app.passport.initialize()

Attach controllers and models.

		app.controllers = {}
		app.models = {}

		for category, list of controllers
			app.controllers[category] = {}
			app.controllers[category][name] = controller for name, controller of list app

Configure middleware and REST routes

		app.use.apply app, [route].concat methods for route, methods of routes.middleware app
		app.get.apply app, [route].concat methods for route, methods of routes.get app
		app.post.apply app, [route].concat methods for route, methods of routes.post app
		app.put.apply app, [route].concat methods for route, methods of routes.put app
		app.delete.apply app, [route].concat methods for route, methods of routes.delete app
		app.use.apply app, [route].concat methods for route, methods of routes.error app

Start the server.

		server = require('http').createServer app
		server.listen app.get("port"), () ->
			console.log "#{"Bipio".cyan} (version #{pkg.version.cyan}) on #{ip.address().blue}:#{app.get('port').toString().red}"

		return app

	module.exports = Bipio

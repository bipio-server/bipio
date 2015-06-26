Passport Config
===

	module.exports = (app) ->

		Strategies = {}

		for name, value of app.config.auth
			Strategies[name] = require("passport-#{name}").Strategy

		app.passport.serializeUser (user, done) ->
			done null, user.id

		app.passport.deserializeUser (obj, done) ->
			done null, obj

		callback = (args...) ->
			process.nextTick () -> args[args.length-1](null, args[args.length-2])

		app.passport.use new Strategies[name](app.config.auth[name], callback) for name, value of Strategies

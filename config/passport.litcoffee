Passport Config
===

	module.exports = (app) ->

		Strategies = {}

		for name, value of app.config.oauth
			Strategies[name] = require("passport-#{name}").Strategy

		app.passport.serializeUser (user, done) ->
			done null, user.id

		app.passport.deserializeUser (obj, done) ->
			done null, obj

		callback = (args...) ->
			process.nextTick () -> done null, args[args.length-2]

		app.passport.use new Strategies[name](app.config.oauth[name], callback) for name, value of Strategies

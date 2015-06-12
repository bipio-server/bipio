Passport Config
===

	module.exports = (app) ->

		Strategies =
			twitter: require('passport-twitter').Strategy
			slack: require('passport-slack').Strategy

		app.passport.serializeUser (user, done) ->
			done null, user.id

		app.passport.deserializeUser (obj, done) ->
			done null, obj

		callback = (args...) ->
			process.nextTick () -> done null, args[args.length-2]

		app.passport.use new Strategies[name](app.config.oauth[name], callback) for name, value of Strategies

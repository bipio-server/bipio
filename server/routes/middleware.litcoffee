Middleware
----------

	module.exports = (app) ->

		return {

			'/favicon.ico': (req, res) -> res.status 200

			'/bip/*': [ app.controllers.global.before_all ]

			'/rest/*': [ app.passport.authenticate('basic', { session: false }), app.controllers.global.before_all ]

			'/rpc/*': [ app.passport.authenticate('basic', { session: false }), app.controllers.global.before_all ]

		}
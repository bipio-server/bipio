Middleware
----------

	module.exports = (app) ->

		return {

			'/favicon.ico': (req, res) -> res.status 200

			'/bip/*': [ app.controllers.global.before_all ]

			'/rest/*': if app.get('port') is not app.testPort then [ app.passport.authenticate('basic', { session: false }), app.controllers.global.before_all ] else [ app.controllers.global.before_all ]

			'/rpc/*': if app.get('port') is not app.testPort then [ app.passport.authenticate('basic', { session: false }), app.controllers.global.before_all ] else [ app.controllers.global.before_all ]

		}
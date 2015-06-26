HTTP Get
--------

	module.exports = (app) ->

		return {

			'/rest/:resource': [ app.controllers.global.get ]
			'/rest/:resource/:id': [ app.controllers.global.get ]

			'/status': [ app.controllers.global.get_status ]

			'/rpc/bip/:id/start': [ app.controllers.bip.start ]
			'/rpc/bip/:id/pause': [ app.controllers.bip.pause ]

			#'/bip/http/:id': [ app.controllers.bip.send ]

			'/rpc/auth/twitter/auth': [ app.passport.authorize 'twitter' ]
			'/rpc/auth/twitter/cb': [ app.passport.authorize 'twitter' ]

			'/rpc/auth/slack/auth': [ app.passport.authorize 'slack' ]
			'/rpc/auth/slack/cb': [ app.passport.authorize 'slack' ]

			'/rpc/auth/google/auth': [ app.passport.authorize 'google' ]
			'/rpc/auth/google/cb': [ app.passport.authorize 'google' ]

		}
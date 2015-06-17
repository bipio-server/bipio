HTTP Get
--------

	module.exports = (app) ->

		return {

			'/rest/:resource': [ app.controllers.global.get ]
			'/rest/:resource/:id': [ app.controllers.global.get ]

			'/status': [ app.controllers.global.get_status ]

			'/rpc/oauth/twitter/auth': [ app.passport.authorize 'twitter' ]
			'/rpc/oauth/twitter/cb': [ app.passport.authorize 'twitter' ]

			'/rpc/oauth/slack/auth': [ app.passport.authorize 'slack' ]
			'/rpc/oauth/slack/cb': [ app.passport.authorize 'slack' ]

		}
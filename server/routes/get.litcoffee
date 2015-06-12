HTTP Get
--------

	module.exports = (app) ->

		return {

			'/rest/bip/:id': [ app.controllers.bip.get ]

			'/status': [ app.controllers.global.get_status ]

			'/rpc/oauth/twitter/auth': [ app.passport.authorize 'twitter' ]
			'/rpc/oauth/twitter/cb': [ app.passport.authorize 'twitter' ]

			'/rpc/oauth/slack/auth': [ app.passport.authorize 'slack' ]
			'/rpc/oauth/slack/cb': [ app.passport.authorize 'slack' ]

		}
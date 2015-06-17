HTTP Post
---------

	module.exports = (app) ->

		return {

			'/rest/:resource': [ app.controllers.global.post ]
			'/rest/:resource/:id': [ app.controllers.global.post ]

			#'/bip/http/:name': [ app.controllers.bip.start ]

		}
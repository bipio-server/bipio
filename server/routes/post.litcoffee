HTTP Post
---------

	module.exports = (app) ->

		return {

			'/rest/bip': [ app.controllers.bip.create ]

			'/bip/http/:name': [ app.controllers.bip.start ]

		}
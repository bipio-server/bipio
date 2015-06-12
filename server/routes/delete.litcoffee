HTTP Delete
-----------

	module.exports = (app) ->

		return {

			'/bip/:id': [ app.controllers.bip.del ]

		}
HTTP Put
--------

	module.exports = (app) ->

		return {

			'/rest/bip/:id': [ app.controllers.bip.update ]

		}
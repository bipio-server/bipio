HTTP Delete
-----------

	module.exports = (app) ->

		return {

			'/rest/:resource': [ app.controllers.global.del ]
			'/rest/:resource/:id': [ app.controllers.global.del ]

		}
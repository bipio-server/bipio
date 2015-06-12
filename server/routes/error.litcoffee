Error Handler
-------------

	path = require 'path'

	module.exports = (app) ->

		return {

			'/': [
				(err) ->
					app.error err if err
			]
			
		}
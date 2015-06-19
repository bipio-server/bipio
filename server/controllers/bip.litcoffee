### Bip Controller

Handles bip-specific endpoints.

	Bip = require "../models/bips"

	module.exports = (app) ->

		return {

###### `start`

Starts a Bip by adding it to the [Job Queue](../utilities/bastion.litcoffee#addJob).

			start: (req, res, next) ->

				app.database.get "bips", req.params.id, (err, result) ->
					bip = app.bastion.broker.addJob(result)
					

		}
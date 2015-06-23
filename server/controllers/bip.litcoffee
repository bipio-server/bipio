### Bip Controller

Handles bip-specific endpoints.

	Bip = require "../models/bips"
	Rx = require 'rx'

	module.exports = (app) ->

		return {

###### `start`

Starts a Bip by adding it to the [Job Queue](../utilities/bastion.litcoffee#addJob).

			start: (req, res, next) ->
				app.database.get "bips", req.params.id, (err, result) ->
					job = app.bastion.addJob result
					job.then (written) ->
						if written?
							res.status(200)
						else
							res.status(500)

		}
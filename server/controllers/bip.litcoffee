### Bip Controller

Handles bip-specific endpoints.

	module.exports = (app) ->

		return {

###### `start`

Starts a Bip by adding it to the [Job Queue](../utilities/bastion.litcoffee#addJob).

			start: (req, res, next) ->
				console.log "start bip"
				res.status(200)
				#next()

		}
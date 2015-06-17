### Bip Controller

Handles incoming data from the `/rest/bip` routes.

	r = require 'rethinkdb'

	module.exports = (app) ->

		return {

###### `controllers.bip.validate`

Validates `req.body` data sent to create a bip.

			validate: (req, res, next) ->
				# validate incoming data
				req.bip = new app.models.Bip req.body

				next()

###### `controllers.bip.start`

Starts a bip.

			start: (req, res, next) ->

				app.log "Subdomains: ", req.subdomains
				
				app.database.get 'bips', req.params,  (err, result) ->
					app.log "Retrieved Bip #{req.params.id}"
					next()

###### `controllers.bip.get`

Gets a bip from the database.

			get: (req, res) ->
				app.database.get 'bips', req.params,  (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

###### `controllers.bip.create`

Creates a bip.

			create: (req, res) ->

				app.database.save 'bips', req.bip.toJSON(), {returnChanges: true}, (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

###### `controllers.bip.update`

Updates a bip.

			update: (req, res) ->

				###

				app.database.update 'bips', req.bip.toJSON(), {returnChanges: true}, (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

				###

###### `controllers.bip.del`

Deletes a bip.

			del: (req, res) ->
				app.database.remove 'bips', req.params, (err, result) ->
					if err
						res.status(500).json err
					else
						console.log "Cleaning up...".yellow
						res.status(200).json result

		}
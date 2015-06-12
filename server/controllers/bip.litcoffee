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

				console.log req.subdomains
				
				r.table('bips').get(req.params.name).run app._rdbConn, (err, cursor) ->
					console.log err, cursor 
					if err
						res.status(500).json err
					else
						###cursor.toArray (err, result) ->
							if err
								res.status(500).json err
							else
								console.log result###

###### `controllers.bip.get`

Gets a bip from the database.

			get: (req, res) ->
				r.table('bips').get(req.params.id).run app._rdbConn, (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

###### `controllers.bip.create`

Creates a bip.

			create: (req, res) ->

				r.table('bips').insert(req.bip.toJSON(), {returnChanges: true}).run app._rdbConn, (err, result) ->
					if err
						res.status(500).json err
					else if result.inserted is not 1
						res.status(500).json new Error("Document not inserted")
					else
						res.status(200).json result.changes[0].new_val

###### `controllers.bip.update`

Updates a bip.

			update: (req, res) ->

				###r.table('bips').insert(req.bip.toJSON(), {returnChanges: true}).run app._rdbConn, (err, result) ->
					if err
						res.status(500).json err
					else if result.inserted is not 1
						res.status(500).json new Error("Document not inserted")
					else
						res.status(200).json result.changes[0].new_val###

###### `controllers.bip.del`

Deletes a bip.

			del: (req, res) ->
				r.table('bips').delete().run app._rdbConn, (err, result) ->
					if err
						res.status(500).json err
					else
						console.log "Cleaning up...".yellow
						res.status(200).json result

		}
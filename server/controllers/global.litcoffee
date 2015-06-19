### Global Controller

Handles global (app-level) endpoints.

	module.exports = (app) ->

		return {

###### `before_all`

Global handler, invoked per-request. Useful for debugging.

			before_all: (req, res, next) ->
				app.log "#{req.method.green} #{req.originalUrl}"
				next()

###### `get`

Generic HTTP GET handler. Retrieves a resource.

			get: (req, res) -> 
				
				app.database.get "#{req.params.resource}s", req.params.id, (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

###### `post`

Generic HTTP POST handler. Creates or updates a resource.

			post: (req, res) ->

				id = if req.params.id then req.params.id else {}

				Model = require("../models/#{req.params.resource}s")
				
				req[req.params.resource] = new Model req.body

				respond = (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

				app.database.get "#{req.params.resource}s", req[req.params.resource].id, (err, result) ->
					if result is null
						console.log "Item not found. Create it from the request"
						app.database.insert "#{req.params.resource}s", req[req.params.resource].toJSON(), {returnChanges: true}, respond
					else
						console.log "Item found. Update it (destructively for now)"
						app.database.update "#{req.params.resource}s", req[req.params.resource].toJSON(), respond

###### `del`

Generic HTTP DELETE handler. Deletes a resource.

			del: (req, res) -> 
				app.database.remove "#{req.params.resource}s", req.params.id, (err, result) ->
					if err
						res.status(500).json err
					else
						res.status(200).json result

###### `get_status`

Get status of API and underlying infrastructure.

			get_status: (req, res) ->
				res.status(200).json { status: "alive" }

###### `get_subdomain`

Get subdomain from request

			get_subdomain: (req, res, next) ->

				#r.table('domains').get(req.params.id).run app._rdbConn, (err, result) ->
				#	next err if err

				#else if req.terminateAt?.global = 'get_subdomain'
				#	res.status 200

				#else next()

		}

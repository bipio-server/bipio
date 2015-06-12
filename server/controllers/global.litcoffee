### Global Controller

Handles global (app-level) endpoints.

	module.exports = (app) ->

		return {

###### `controllers.global.before_all`

Global handler, invoked per-request. Useful for debugging.

			before_all: (req, res, next) ->
				app.log "#{req.method.green} #{req.originalUrl}"
				next()

###### `controllers.global.get_status`

Get status of API and underlying infrastructure.

			get_status: (req, res) ->
				res.status(200).json { status: "alive" }

###### `controllers.global.get_subdomain`

Get subdomain from request

			get_subdomain: (req, res, next) ->

				r.table('domains').get(req.params.id).run app._rdbConn, (err, result) ->
					next err if err

				#else if req.terminateAt?.global = 'get_subdomain'
				#	res.status 200

				#else next()

		}

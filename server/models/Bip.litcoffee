Bip
===

	uuid = require 'node-uuid'
	graphlib = require 'graphlib'
	Graph = graphlib.Graph
	_ = require 'underscore'

	schema =
		id: 'string'
		domain_id: 'string'
		name: 'string'
		type: 'string'

	class Bip extends Graph

		constructor: (object) ->
			super { directed: true, multigraph: false, compound: true }

			self = @

			object.id = uuid.v4() if not object.hasOwnProperty 'id'

			_.mapObject schema, (value, key) -> self[key] = object[key] if typeof object[key] is value

			@setNode action.id, action for action in object.actions
			@setEdge edge.id, edge for edge in object.edges

			console.log "Bip object instantiated with id #{this.id}".cyan

			@

		setAction: (action) ->
			@setNode action.id, action if action.hasOwnProperty id

		getAction: (id) ->
			@node id

		run: () ->
			for pipe in @edges()
				edge = @edge(pipe.v, pipe.w) # Retrieve each edge on the graph
				itokens = edge.in.split "."
				otokens = edge.out.split "."
				edge.in = new require("bip-pod-#{itokens[0]}")(@getAction(pipe.v).auth)[itokens[1]](@getAction(pipe.v))
				edge.out = new require("bip-pod-#{otokens[0]}")(@getAction(pipe.w).auth)[otokens[1]](@getAction(pipe.w))
				edge.in.then (i) -> edge.out.then (o) -> i.subscribe o # subscribe the promises on the edge

		toJSON: () ->
			self = @
			return _.mapObject schema, (value, key) -> self[key]

	module.exports = Bip
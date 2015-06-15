### Bip Model

	uuid = require 'node-uuid'
	graphlib = require 'graphlib'
	Graph = graphlib.Graph
	_ = require 'underscore'

###### Bip schema

	schema =
		id: 'string'
		domain_id: 'string'
		name: 'string'
		type: 'string'
		options: 'object'
		nodes: 'object'
		edges: 'object'

#### Class Bip

extends [Graph](https://github.com/cpettitt/graphlib)

	class Bip extends Graph

		constructor: (object) ->
			self = @
			
			# Set default graph options.
			super { directed: true, multigraph: false, compound: true }

			# Set default bip id if none provided.
			object.id = uuid.v4() if not object.hasOwnProperty 'id'

			@[key] = object[key] for key, value of schema

			console.log "Bip object instantiated with id #{this.id}".cyan

			@

###### `Bip.setAction`

Semantic wrapper method for Graph.setNode().

		setAction: (action) ->
			@setNode action.id, action if action.hasOwnProperty id

###### `Bip.getAction`

Semantic wrapper method for Graph.node().

		getAction: (id) ->
			@node id

###### `Bip.run` 

Runs the bip by instantiating pods with supplied auth, connecting the pipes via `Rx.Observer.subscribe()`.

		run: () ->
			# Retrieve each edge on the graph.
			for pipe in @edges()
				edge = @edge(pipe.v, pipe.w)

				# Split edge.in and edge.out strings into tokens.
				itokens = edge.in.split "."
				otokens = edge.out.split "."

				# Replace edge.in and edge.out with Promises containing the Observables/Observers.
				edge.in = new require("../../pods/bip-pod-#{itokens[0]}")(@getAction(pipe.v).auth)[itokens[1]](@getAction(pipe.v))
				edge.out = new require("../../pods/bip-pod-#{otokens[0]}")(@getAction(pipe.w).auth)[otokens[1]](@getAction(pipe.w))

				# Connect the Observable to the Observer.
				edge.in.then (i) -> 
					edge.out.then (o) -> 
						i.subscribe o
						console.log "#{pipe} connected."

###### `Bip.toJSON`

Retrieves JSON representation of bip. 

		toJSON: () ->
			obj = graphlib.json.write @
			for key, value in schema
				obj[key] = @[key] if typeof @[key] is value
			obj

	module.exports = Bip
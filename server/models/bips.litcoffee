### Bip Model

	uuid = require 'node-uuid'
	graphlib = require 'graphlib'
	Graph = graphlib.Graph
	_ = require 'underscore'
	Model = require './index'
	keys = require '../../config/keys'
	Q = require 'q'

#### Class Bip

extends [Graph](https://github.com/cpettitt/graphlib)

	class Bip extends Graph

###### Bip schema

		schema:
			id: 'string'
			domain_id: 'string'
			name: 'string'
			type: 'string'
			options: 'object'
			nodes: 'object'
			edges: 'object'

		constructor: (object) ->
			self = @

			self[name] = method.bind self for name, method of new Model()
			
			# Set default graph options.
			super { directed: true, multigraph: false, compound: true }

			# Set default bip id if none provided.
			object.id = uuid.v4() if not object.hasOwnProperty 'id'

			self[key] = object[key] for key, value of self.schema

			self

###### `Bip.setAction`

Semantic wrapper method for Graph.setNode().

		setAction: (action) ->
			@setNode action.id, action if action.hasOwnProperty id

###### `Bip.getAction`

Semantic wrapper method for Graph.node().

		getAction: (id) ->
			@node id

		active_pipes: []

###### `Bip.run` 

Runs the bip by instantiating pods with supplied auth, connecting the pipes via `Rx.Observer.subscribe()`.

		start: () ->
			self = @
			# Retrieve each edge on the graph.
			for pipe in self.edges

				# Split pipe.v and pipe.w strings into tokens.
				tokens = 
					in: pipe.v.split "."
					out: pipe.w.split "."

				actions = {}
				actions.in = node.value for node in self.nodes when node.v is pipe.v
				actions.out = node.value for node in self.nodes when node.v is pipe.w

				pods = {}
				pods.in = new (require("../../pods/bip-pod-#{tokens.in[0]}"))(keys.pods[tokens.in[0]])
				pods.out = new (require("../../pods/bip-pod-#{tokens.out[0]}"))(keys.pods[tokens.out[0]])

				# Create active pipe with Promises containing the Observables/Observers.
				result = {}
				result.in = pods.in[tokens.in[1]](actions.in)
				result.out = pods.out[tokens.out[1]](actions.out)

				# Connect the Observable to the Observer.
				result.in.then (i) -> 
					result.out.then (o) -> 
						i.subscribe o
						console.log "Pipe connected."

				self.active_pipes.push result

			@

	module.exports = Bip

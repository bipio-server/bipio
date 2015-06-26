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
			url: 'string'

		constructor: (object) ->
			model = new Model()
			@[name] = method.bind @ for name, method of model
			
			# Set default graph options.
			super { directed: true, multigraph: false, compound: true }

			# Set default bip id if none provided.
			object.id = uuid.v4() if not object.hasOwnProperty 'id'

			@[key] = object[key] for key, value of @schema

			@

###### `setAction`

Semantic wrapper method for Graph.setNode().

		setAction: (action) ->
			@setNode action.id, action if action.hasOwnProperty id

###### `getAction`

Semantic wrapper method for Graph.node().

		getAction: (id) ->
			@node id

		cleanup: () ->
			@observables = null if @observables 
			@observers = null if @observers
			pipe.dispose() for pipe in @disposables
			return null

###### `start` 

Runs the bip by instantiating pods with supplied auth, connecting the pipes via `Rx.Observer.subscribe()`.

		start: (payload) ->
			self = @

			subscribe = (edge, observable, observer) ->

				self.observables = {}

				self.observers = {}

				self.disposables = []

				observable.then (i) -> 
					self.observables[edge.v] = i
					#console.log "Observable Retrieved: ", i
					
				observer.then (o) ->
					self.observers[edge.w] = o
					self.disposables.push self.observables[edge.v].subscribe(self.observers[edge.w])
					#console.log "Observer Retrieved: ", o

			for pipe, index in self.edges
				vtokens = pipe.v.split(".")
				wtokens = pipe.w.split(".")

				vnode = node.value for node in self.nodes when node.v is pipe.v
				vnode = payload if pipe.v is "http.on_new_payload"
				wnode = node.value for node in self.nodes when node.v is pipe.w

				v = new (require("../../pods/bip-pod-#{vtokens[0]}"))(keys.pods[vtokens[0]])
				w = new (require("../../pods/bip-pod-#{wtokens[0]}"))(keys.pods[wtokens[0]])

				subscribe(pipe, v[vtokens[1]](vnode), w[wtokens[1]](wnode)) 

	module.exports = Bip

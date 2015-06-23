bip-pod-http
===

	Pod 	= require '../bip-pod'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class HTTP extends Pod

		constructor: (@auth) ->
			@_queue = rabbit.createContext @auth
			@_sub = @_queue.socket('WORKER', {prefetch: 1, persistent: true})
			@

		on_new_payload: (action) ->
			self = @
			d = Q.defer()

			self._sub.connect 'payloads', () ->
				d.resolve Rx.Observable.fromEvent self._sub, "data"

			d.promise

	module.exports = HTTP
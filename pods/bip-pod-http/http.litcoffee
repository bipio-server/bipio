bip-pod-http
===

	Pod 	= require '../bip-pod'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class HTTP extends Pod

		constructor: (@auth) ->
			@

		on_new_payload: (payload) ->
			self = @
			d = Q.defer()

			sendPayload = (observer) ->
				observer.onNext payload

			observable = Rx.Observable.create sendPayload

			d.resolve observable

			d.promise

	module.exports = HTTP
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

			observable = Rx.Observable.create (observer) ->
				process.nextTick () ->
					observer.onNext payload

			d.resolve observable

			d.promise

	module.exports = HTTP
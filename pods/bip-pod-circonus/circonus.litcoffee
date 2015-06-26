bip-pod-circonus
===

	Pod 	= require '../bip-pod'
	circonus 	= require 'circonusapi2'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Circonus extends Pod

		constructor: (@auth) ->
			@

		check_bundle: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				setImmediate () ->
					self._client = circonus.setup self.auth.auth_token, self.auth.app_name
					transform = self.Transform action.config, action.transforms, obj
					self._client.send transform

			d.resolve Rx.Observer.create next, console.error, console.log

			d.promise

	module.exports = Circonus
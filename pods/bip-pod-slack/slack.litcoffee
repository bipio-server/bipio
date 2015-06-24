bip-pod-slack
===

	Pod 	= require '../bip-pod'
	slack 	= require 'node-slack'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Slack extends Pod

		constructor: (@auth) ->
			@

		post_to_channel: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				process.nextTick () ->
					self._client = new slack self.auth.web_hook
					transform = self.Transform action.config, action.transforms, obj
					self._client.send transform

			d.resolve Rx.Observer.create next, console.error, console.log

			d.promise

	module.exports = Slack
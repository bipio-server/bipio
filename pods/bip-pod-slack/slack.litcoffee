bip-pod-slack
===

	Pod 	= require '../bip-pod'
	slack 	= require 'node-slack'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Slack extends Pod

		constructor: (@auth) ->
			@_client = new slack @auth.web_hook
			@

		post_to_channel: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				setImmediate () ->
					console.log obj
					self._client.send(self.Transform action.config, action.transforms, obj)

			observer = Rx.Observer.create next, console.error, console.log

			d.resolve observer

			d.promise

	module.exports = Slack
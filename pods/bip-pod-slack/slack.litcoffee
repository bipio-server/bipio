bip-pod-slack
===

	Pod 	= require '../bip-pod'
	Slack 	= require 'node-slack'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Slack extends Pod

		constructor: (auth) ->
			@_client = new Slack auth
			@

		send_message: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				self._client.send self.Transform(action.config, action.transforms, obj)

			d.resolve Rx.Observer.create next, error, complete

			d.promise

	module.exports = Slack
### Bastion helper class.

	rabbit = require 'rabbit.js'
	events = require 'events'
	Q = require 'q'
	Rx = require 'rx'

	class Bastion

		constructor: (url) ->
			self = @

			self.queue = rabbit.createContext url

			self.queue.on 'ready', () ->
				console.log "RabbitMQ Connected"
				self.pub = self.queue.socket('PUSH')
				self.sub = self.queue.socket('WORKER', {prefetch: 1})
				self.broker = Rx.Observable.fromEvent self.sub, "data"

			self.queue.on 'error', (err) ->
				console.log err

			self

		getBroker: () ->
			@broker

		addJob: (bip) ->
			self = @
			self.sub.connect 'bips', () -> 
				self.pub.connect 'bips', () ->					
					self.pub.write JSON.stringify(bip), 'utf8'

		acknowledge: () ->
			@sub.ack() 

	module.exports = Bastion
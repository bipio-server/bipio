### Bastion 

A helper class. Manages work taken from the job queue.

	rabbit = require 'rabbit.js'
	events = require 'events'
	Bip = require '../models/bips'
	Q = require 'q'
	Rx = require 'rx'

	class Bastion extends events.EventEmitter

		constructor: (app) ->
			self = @

			self.queue = rabbit.createContext app.config.amqp.url
			self.subscriptions = {}

			self.queue.on 'ready', () ->
				console.log "RabbitMQ Connected"

				if app.options?.worker is true
					self.sub = self.queue.socket('WORKER', {prefetch: 1, persistent: true})
					self.broker = Rx.Observable.fromEvent self.sub, "data"

					self.sub.connect "bips", () ->

						error = (err) -> 
							console.error "Graph Error: #{err.msg}".red

						complete = () -> 
							console.log "Worker Idle.".yellow

						next = (buf) ->
							setImmediate () ->
								obj = JSON.parse(buf.toString())
								console.log obj
								buf = null
								if obj?.do
									switch obj.do
										when "pause"
											console.log "Pausing #{obj.to}"
											app.database.update "bips", obj.to, { active: false }, (err, result) ->
												if err
													app.error "Graph error: #{err.msg}"
												else
													if self.subscriptions.hasOwnProperty result.id
														self.subscriptions[result.id].cleanup()
														self.sub.ack()
														app.dialog "Bip #{result.id} (#{result.type}) is now paused."

										when "activate"
											console.log "Activating #{obj.to}"
											app.database.update "bips", obj.to, { active: true }, (err, result) ->
												if err
													app.error "Graph error: #{err.msg}"
												else
													self.subscriptions[result.id] = new Bip(result)
													self.subscriptions[result.id].start()
													self.sub.ack()
													app.dialog "Bip #{result.id} (#{result.type}) is now active."

										when "send"
											console.log "Sending #{obj.with} to #{obj.to}"
											app.database.update "bips", obj.to, { active: true }, (err, result) ->
												if err
													app.error "Graph error: #{err.msg}"
												else
													setImmediate () ->
														self.subscriptions[result.id] = new Bip(result)
														self.subscriptions[result.id].start(obj.with)
														self.sub.ack()
														app.dialog "#{obj.with} has been sent to #{obj.to}"
														#self.subscriptions[result.id].cleanup()###

						worker = Rx.Observer.create next, error, complete
						self.start = self.broker.subscribe worker

				else 
					self.push = self.queue.socket('PUSH')

###### `addJob`

Adds a bip object representation to the AMQP exchange.

					self.addJob = (topic, obj) ->
						deferred = Q.defer()

						self.push.connect topic, () ->
							self.push.write JSON.stringify(obj), 'utf8'
							deferred.resolve true

						deferred.promise

			self.queue.on 'error', (err) ->
				throw new Error "RabbitMQ connection could not be established. Please make sure there is a RabbitMQ broker running at #{app.config.amqp.url}".red

			return self

	module.exports = Bastion
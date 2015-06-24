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
					self.sub = self.queue.socket('WORKER', {persistent: true})
					self.broker = Rx.Observable.fromEvent self.sub, "data"

					self.sub.connect "bips", () ->

						error = (err) -> 
							console.error "Graph Error: #{err.msg}".red

						complete = () -> 
							console.log "Worker Idle.".yellow

						next = (buf) ->
							process.nextTick () ->
								obj = JSON.parse(buf.toString())
								console.log obj
								if obj?.do
									switch obj.do
										when "pause"
											console.log "Pausing #{obj.to}"
											app.database.update "bips", obj.to, { active: false }, (err, result) ->
												if err
													throw new Error err
												else
													if self.subscriptions.hasOwnProperty result.id
														pipe.dispose() for pipe in self.subscriptions[result.id].active_pipes
														delete self.subscriptions[result.id]
														self.sub.ack()
														app.dialog "Bip #{result.id} (#{result.type}) is now paused."

										when "activate"
											console.log "Activating #{obj.to}"
											app.database.update "bips", obj.to, { active: true }, (err, result) ->
												if err
													throw new Error err
												else
													bip = new Bip result
													bip.start()
													self.subscriptions[bip.id] = bip
													self.sub.ack()
													app.dialog "Bip #{result.id} (#{result.type}) is now active."

										when "send"
											console.log "Sending #{obj.with} to #{obj.to}"
											app.database.update "bips", obj.to, { active: true }, (err, result) ->
												if err
													throw new Error err
												else
													bip = new Bip result
													bip.start(obj.with)
													self.subscriptions[bip.id] = bip
													self.sub.ack()
													app.dialog "#{obj.with} has been sent to #{obj.to}"

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
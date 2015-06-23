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

			self.queue.on 'ready', () ->
				console.log "RabbitMQ Connected"

				if app.options?.worker is true
					self.sub = self.queue.socket('WORKER', {prefetch: 1, persistent: true})
					self.broker = Rx.Observable.fromEvent self.sub, "data"
				
###### `error`

Used as second argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

					self.error = (err) -> 
						console.error "Graph Error: #{err.msg}".red

###### `complete`

Used as third argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

					self.complete = () -> 
						console.log "Worker Idle.".yellow

###### `next`

Used as first argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

					self.next = (buf) ->
						process.nextTick () ->
							console.log "New Job", JSON.parse(buf.toString(), null, 4)
							if JSON.parse(buf.toString())?.id
								app.database.update "bips", JSON.parse(buf.toString())?.id, { active: true }, (err, result) ->
									if err
										throw new Error err
									else
										app.dialog "Bip #{result.id} (#{bip.type}) is now active."
										bip = new Bip result
										bip.start()
										self.sub.ack()

					self.sub.connect 'bips', () ->
						self.worker = Rx.Observer.create self.next, self.error, self.complete
						self.broker.subscribe self.worker

				else 
					self.pub = self.queue.socket('PUSH')

###### `addJob`

Adds a bip object representation to the AMQP exchange.

					self.addJob = (bip) ->
						deferred = Q.defer()

						self.pub.connect 'bips', () ->
							self.pub.write JSON.stringify(bip), 'utf8'
							deferred.resolve true

						deferred.promise

			self.queue.on 'error', (err) ->
				console.log err

			return @

	module.exports = Bastion
### Bastion 

A helper class. Manages work taken from the job queue.

	rabbit = require 'rabbit.js'
	events = require 'events'
	Bip = require '../models/bips'
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
				
				self.worker = Rx.Observer.create self.run, self.error, self.complete
				self.worker.ack = self.sub.ack

				self.broker.subscribe self.worker

			self.queue.on 'error', (err) ->
				console.log err

			self

###### `addJob`

Adds a bip object representation to the AMQP exchange.

		addJob: (bip) ->
			self = @
			self.sub.connect 'bips', () -> 
				self.pub.connect 'bips', () ->					
					self.pub.write JSON.stringify(bip), 'utf8'

###### `next`

Used as first argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

		next: (buf) ->
			@ack()
			bip = new Bip(JSON.parse buf.toString())
			bip.run()

###### `error`

Used as second argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

		error: (err) -> console.error "Graph Error: #{err.msg}".red

###### `complete`

Used as third argument to [Rx.Observer.create](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md#rxobservercreateonnext-onerror-oncompleted) when subscribing to the job queue.

		complete: () -> console.log "Worker Idle.".yellow

	module.exports = Bastion
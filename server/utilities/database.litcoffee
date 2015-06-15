### Database helper class

	events = require 'events'
	db = require 'rethinkdb'
	Q = require 'q'

	class Database extends events.EventEmitter

		constructor: (@options) ->
			self = @

			db.connect @options, (err, connection) ->
				if err
					throw new Error err
				else
					self.connection = connection
					self.emit "ready"
			self

###### `Database.get`

Retrieves an entry from the DB.

		get: (modelName, options, next) ->
			self = @
			deferred = Q.defer()

			db.table(modelName).filter(options).run self.connection, (err, cursor) ->
				if err
					throw new Error err
				else
					cursor.toArray (err, batch) ->
						if err
							throw new Error err;
						else
							result = JSON.stringify batch, null, 2
							next null, result if next
							deferred.resolve result

			deferred.promise

###### `Database.save`

Saves an entry to the DB.

		save: (modelName, object, options, next) ->
			self = @
			deferred = Q.defer()

			db.table(modelName).insert(object, options).run self.connection, (err, result) ->
				if err
					throw new Error err
				else if result.inserted is not 1
					throw new Error "Document not inserted"
				else
					next null, result.changes[0].new_val if next
					deferred.resolve result.changes[0].new_val

			deferred.promise

###### `Database.update`

Updates an entry in the DB.

		update: (modelName, object, next) ->
			self = @
			deferred = Q.defer()

			db.table(modelName).get(object.id).update(object).run self.connection, (err, result) ->
				if err
					throw new Error err
				else
					next null, result.changes[0].new_val if next
					deferred.resolve result.changes[0].new_val

			deferred.promise

###### `Database.remove`

Removes an entry from the DB.

		remove: (modelName, options, next) ->
			self = @
			deferred = Q.defer()

			db.table(modelName).delete(options).run self.connection, (err, result) ->
				if err
					throw new Error err
				else
					next null, result if next
					deferred.resolve result

			deferred.promise

	module.exports = Database

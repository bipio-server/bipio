### Database helper class

	events = require 'events'
	db = require 'rethinkdb'
	fs = require 'fs'
	Q = require 'q'

	class Database extends events.EventEmitter

		constructor: (@options) ->
			self = @

			db.connect @options, (err, connection) ->
				if err
					throw new Error err
				else
					self.connection = connection
					db.dbList().run self.connection, (err, result) ->
						if result.indexOf('bipio') < 0
							db.dbCreate('bipio').run self.connection, (err, results) ->
								throw new Error err if err
								self.createTables()
						else 
							self.createTables()

			self

###### `Database.createTables`

Creates tables based on the contents of [Models folder](../models). Bypasses if table exists already.

		createTables: () ->
			self = @
			promises = []
			db.tableList().run self.connection, (err, tables) ->
				throw new Error err if err

				for model in fs.readdirSync(path.join(__dirname, "../models")) when model isnt 'index.litcoffee'
					tableName = model.replace ".litcoffee", ""
					d = Q.defer()
					
					if tables.indexOf(tableName) < 0
						
						db.tableCreate(tableName).run self.connection, (err, results) ->
							throw new Error err if err
							console.log "Created table `#{results.config_changes[0].new_val.name}` in db `#{results.config_changes[0].new_val.db}`"
							d.reject err if err
							d.resolve results

					else
						d.resolve true

					promises.push d.promise

				Q.all(promises).then (results) ->
					self.emit "ready"

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
							throw new Error err
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

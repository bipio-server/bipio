var gulp = require('gulp'),
	nodemon = require('gulp-nodemon'),
	coffee = require('gulp-coffee');

gulp.task('build', function() {
	gulp.src('./browser/**/*.litcoffee')
		.pipe(coffee({literate: true})).on('error', console.error)
		.pipe(gulp.dest('./server/public/scripts/'))
})

gulp.task('dev', function() {
	
	nodemon({ script: 'index.js', ext: 'html litcoffee jade', ignore: ['server/data', 'browser']})
    .on('restart', function () {
      console.log('Restarting...')
    })

    gulp.watch('./browser/**/*.litcoffee', ['build'])

})

gulp.task('default', ['dev']);
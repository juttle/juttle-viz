var babel = require('gulp-babel');
var babelify = require('babelify');
var browserify = require('browserify');
var connect = require('gulp-connect');
var del = require('del');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var eslint = require('gulp-eslint');
var merge = require('merge-stream');
var mocha = require('gulp-mocha');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');

gulp.task('clean', function(cb) {
    del(['lib', 'build', 'test/build']);
});

gulp.task('lib', function() {
    return gulp.src('src/**')
        .pipe(gulpif(/[.]js$/, babel({
            presets: ['react']
        })))
        .pipe(gulp.dest('lib'));
});

// XXX lib and browserify should use the same babel procedure
// consider using webpack here instead?
gulp.task('browserify', function() {
    return browserify('src/index.js', {
        standalone: 'JuttleViz'
    })
        .transform(babelify, { presets: ['react'] })
        .bundle()
        //Pass desired output filename to vinyl-source-stream
        .pipe(source('juttle-viz.js'))
        // Start piping stream to tasks!
        .pipe(gulp.dest('./build/'));
});

gulp.task('styles', function() {
    gulp.src('styles/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./build/'));
});

gulp.task('watch', function() {
    gulp.watch(['index.js','lib/**/*.js', 'juttle/**/*.js', 'views/**/*.js'], ['browserify']);
    gulp.watch('styles/**/*scss', ['styles']);
});

gulp.task('example-serve', ['browserify', 'styles', 'watch'], function() {
    connect.server({
        port: 8888,
        root: ['examples', 'build', 'node_modules']
    });
});

gulp.task('tests-browserify', function() {
    return browserify('./test/tests')
        .bundle()
        .on('error', function (err) {
            console.log(err.toString());
            this.emit('end');
        })
        .pipe(source('tests.js'))
        .pipe(gulp.dest('test/build/'));
});

gulp.task('test', ['tests-browserify'], function () {
    var browserTests = gulp
    .src('./test/test-runner.html')
    .pipe(mochaPhantomJS({
        log: true,
        timeout: 10000,
        slow: 3000,
        reporter: 'spec',
        ui: 'bdd'
    }));

    var nodeTests = gulp
    .src([
        'test/lib/**/*.spec.js',

        // exclude lib browser tests
        '!test/lib/charts/*.spec.js',
        '!test/lib/generators/*.spec.js',
        '!test/lib/components/*.spec.js'
    ])
    .pipe(mocha({
        log: true,
        timeout: 10000,
        slow: 3000,
        reporter: 'spec',
        ui: 'bdd'
    }));

    return merge(browserTests, nodeTests);
});

gulp.task('lint-test', function() {
    return gulp.src([
        'test/**/*.spec.js',
        '!test/build/**'
    ])
 	.pipe(eslint())
	.pipe(eslint.format())
	.pipe(eslint.failAfterError());
});

gulp.task('lint-src', function() {
    return gulp.src([
        'src/**/*.js'
    ])
 	.pipe(eslint())
	.pipe(eslint.format())
	.pipe(eslint.failAfterError());
});

gulp.task('lint', ['lint-src', 'lint-test']);

gulp.task('default', ['browserify', 'styles', 'lib']);

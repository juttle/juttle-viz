var babel = require('gulp-babel');
var babelify = require('babelify');
var browserify = require('browserify');
var connect = require('gulp-connect');
var del = require('del');
var eslint = require('gulp-eslint');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var isparta = require('isparta');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
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

function gulp_test() {
    return gulp.src([
        'test/**/*.spec.js'
    ])
    .pipe(mocha({
        log: true,
        timeout: 10000,
        slow: 3000,
        reporter: 'spec',
        ui: 'bdd',
        require: ['./test/init.js']
    }));
}

gulp.task('instrument', function () {
    return gulp.src([
        'src/**/*.js'
    ])
    .pipe(istanbul({
        includeUntested: true,
        // ES6 Instrumentation
        instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire());
});

gulp.task('test-coverage', ['instrument'], function() {
    return gulp_test()
    .pipe(istanbul.writeReports())
    .pipe(istanbul.enforceThresholds({
        thresholds: {
            global: {
                statements: 55,
                branches: 44,
                functions: 50,
                lines: 56
            }
        }
    }));
});

gulp.task('test', function () {
    return gulp_test();
});

gulp.task('lint-test', function() {
    return gulp.src([
        'test/**/*.spec.js'
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

var browserSync = require('browser-sync').create();
var del = require('del');
var gulp = require('gulp');
var sass = require('gulp-sass');
var minify = require('gulp-cssnano');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var concatenate = require('gulp-concat');
var optimize = require('gulp-imagemin');
var injectPartials = require('gulp-inject-partials');
var plumber = require('gulp-plumber');
var sequence = require('run-sequence');

// task: browser sync
gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
      baseDir: './dist'
    }
  });
});

// task: clean
gulp.task('clean', function() {
  return del(['dist/*', 'dist/**']);
});

// task: html
gulp.task('html', function() {
  gulp.src(['app/**/*.html', '!app/**/_*.html'])
    .pipe(injectPartials({
      start: '<@import>{{path}}',
      end: '</@import>',
      removeTags: true
    }))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// task: sass
gulp.task('sass', function() {
  gulp.src('app/scss/**/*.scss')
    .pipe(plumber())
    .pipe(sass({
      importer: [
        require('whiteboard-definitions'),
        require('whiteboard-media')
      ]
    }))
    .pipe(concatenate('styles.css'))
    .pipe(sourcemaps.init())
    .pipe(minify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// task: js
gulp.task('js', function() {
  gulp.src('app/js/**/*.js')
    .pipe(plumber())
    .pipe(concatenate('scripts.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js'))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// task: img
var img_exts = 'svg,jpg,jpeg,png,gif';
gulp.task('img', function() {
  gulp.src(['app/img/**/*.{' + img_exts + '}'])
    .pipe(optimize())
    .pipe(gulp.dest('dist/img'));
});

// task: fonts
var font_exts = 'css,svg,ttf,woff,eot';
gulp.task('fonts', function() {
  gulp.src(['app/fonts/**/*.{' + font_exts + '}', '!app/fonts/**/demo-files/*.{' + font_exts + '}'], {base: 'app/fonts'})
    .pipe(gulp.dest('dist/fonts'));
});

// task: watch
gulp.task('watch', ['build', 'browser-sync'], function() {
  gulp.watch('app/**/*.html', ['html']);
  gulp.watch('app/scss/**/*.scss', ['sass']);
  gulp.watch('app/js/**/*.js', ['js']);
  gulp.watch('app/img/**/*.{' + img_exts + '}', ['img']);
  gulp.watch('app/fonts/**/*.{' + font_exts + '}', ['fonts']);
});

// task: build
gulp.task('build', function(done) {
  sequence('clean', ['html', 'sass', 'js', 'img', 'fonts'], done);
});

// task: default
gulp.task('default', ['build']);

var gulp = require('gulp');
var minifyCss = require("gulp-minify-css");
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var DEST = 'dist';

gulp.task('minify-js', function() {
    gulp.src('examples/public/js/*.js')
        .pipe(gulp.dest(DEST))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(DEST))
});

gulp.task('minify-css', function() {
    gulp.src('examples/public/css/formmessenger.css')
        .pipe(gulp.dest(DEST))
        .pipe(minifyCss())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(DEST))
});

gulp.task('default', ['minify-js', 'minify-css']);
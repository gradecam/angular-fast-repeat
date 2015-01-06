'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.initConfig({
        karma: {
            test: {
                configFile: 'test/karma.conf.js',
                singleRun: true,
            }
        },
        uglify: {
            src: {
                files: {
                    'dist/fastRepeat.min.js': ['src/fastRepeat.js']
                }
            }
        }
    });

    grunt.registerTask('default', ['karma', 'uglify']);
};

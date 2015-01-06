'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-karma');

    grunt.initConfig({
        karma: {
            test: {
                configFile: 'test/karma.conf.js',
                singleRun: true,
            }
        }
    });
};

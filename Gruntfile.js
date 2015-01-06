'use strict';

var MVERSION = 'node_modules/mversion/bin/version';
module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-shell');

    grunt.initConfig({
        shell: {
            bump: { command: [MVERSION, '<%= TARGET_VERSION %>'].join(' ') },
            commitArtifactsAndPackages: {
                command: [
                    'git add dist package.json bower.json',
                    'git commit -m "v<%= TARGET_VERSION %>"',
                    'git tag -a -m "v<%= TARGET_VERSION %>" v<%= TARGET_VERSION %>'
                ].join(' && ')
            },
        },
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

    function bump(type) {
        return function() {
            var cfg = require('./package.json'),
                versionParts = /(\d+)\.(\d+)\.(\d+)/.exec(cfg.version).slice(1);
            switch(type) {
                case 'major':
                    versionParts[0] = Number(versionParts[0]) + 1;
                    versionParts[1] = 0;
                    versionParts[2] = 0;
                    break;
                case 'minor':
                    versionParts[1] = Number(versionParts[1]) + 1;
                    versionParts[2] = 0;
                    break;
                case 'patch':
                    versionParts[2] = Number(versionParts[2]) + 1;
                    break;
            }
            grunt.config('TARGET_VERSION', versionParts.join('.'));
            grunt.task.run([
                'uglify:src',
                'shell:bump',
                'shell:commitArtifactsAndPackages',
            ]);
        };
    }
    grunt.registerTask('bump', ['bump:patch']);
    grunt.registerTask('major', bump('major'));
    grunt.registerTask('minor', bump('minor'));
    grunt.registerTask('patch', bump('patch'));
};

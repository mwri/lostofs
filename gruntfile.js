module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		concat: {
			options: {
				separator:    '\n\n',
				stripBanners: { line: true },
				banner:       '// Package: <%= pkg.name %> v<%= pkg.version %> (built <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %>)\n// Copyright: (C) 2017 <%= pkg.author.name %> <<%= pkg.author.email %>>\n// License: <%= pkg.license %>\n\n\n',
			},
			es6: {
				src:  ['lib/*.js'],
				dest: 'dist/<%= pkg.name %>.js',
			},
		},

		strip_code: {
			options: {
				patterns: [
					/\r?\n?^\s+\/\* test-code \*\/(.|[\r\n])*?\/\* end-test-code \*\//gm,
				],
				blocks: [],
			},
			your_target: {
				src: "dist/*.js",
			},
		},

		jshint: {
			files:   ['gruntfile.js', 'lib/*.js', 'test/*.js'],
			options: {
				esversion: 6,
				laxbreak: true,
			},
		},

		simplemocha: {
			all: {
				src: ['test/*.js'],
			},
		},

		mocha_istanbul: {
			all: {
				src: ['test/*.js'],
			},
		},

		watch: {
			full: {
				options: {
					spawn: true,
				},
				files: [
					'lib/*.js',
					'test/*.js',
				],
				tasks: ['build'],
			},
			dev: {
				options: {
					spawn: true,
				},
				files: [
					'lib/*.js',
					'test/*.js',
				],
				tasks: ['dev'],
			},
		},

		clean: [
			'node_modules',
			'coverage',
			'lostofs_fs',
			'lostofs_fs_foobar_db',
			'lostofs_fs_foobar',
		],

		exec: {
			publish_git_status: {
				cmd:      'git status --porcelain',
				stdout:   false,
				callback: function (err, stdout, stderr, args) {
					if (stdout !== '')
						grunt.fail.fatal('git status unclean\n'+stdout);
				},
			},
		},

	});

	grunt.registerTask('prepublish', [
		'clean',
		'exec:publish_git_status',
	]);

	grunt.registerTask('dev', [
		'jshint',
		'concat:es6',
		'simplemocha',
		]);

	grunt.registerTask('build', [
		'jshint',
		'concat:es6',
		'mocha_istanbul',
		'strip_code',
		]);

	grunt.registerTask('default', ['build']);
	grunt.registerTask('test',    ['build']);

	grunt.registerTask('watch_full', ['watch:full']);
	grunt.registerTask('watch_dev',  ['watch:dev']);

};

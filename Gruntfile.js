module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    exec: {
      coverage: {
        command: 'node_modules/.bin/mocha -R html-cov > coverage.html'
      }
    },
    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ';'
      },
      dist: {
        // the files to concatenate
        src: ['src/client/*.js'],
        // the location of the resulting JS file
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    mochaTest: {
      files: ['test/**/*.test.js']
    },
    mochaTestConfig: {
      options: {
        reporter: 'spec',
        timeout: 500,
        require: 'test/common'
      }
    },
    jshint: {
      // define the files to lint
      files: ['gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      // configure JSHint (documented at http://www.jshint.com/docs/)
      options: {
        asi:true,
        boss:true,
        proto:true,
          // more options here if you want to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'mochaTest']
    }
  });


  grunt.registerTask('coverage', 'exec:coverage');

  // this would be run by typing "grunt test" on the command line
  grunt.registerTask('test', ['jshint', 'mochaTest']);

  // the default task can be run just by typing "grunt" on the command line
  grunt.registerTask('default', ['watch', 'jshint', 'mochaTest']);

};
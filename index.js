'use strict';

const Analyzer = require('./lib/analyzer');
const DepFinder = require('./lib/dep-finder');
const Bundler = require('./lib/bundler');
const MergeTrees = require('broccoli-merge-trees');
const debugTree = require('broccoli-debug').buildDebugCallback('ember-auto-import');
const concat = require('broccoli-concat');

module.exports = {
  name: 'ember-auto-import',

  included() {
    this._depFinder = new DepFinder(this.project);
    this.import('ember-auto-imports/ember-auto-imports.js');
    this.import('ember-auto-imports/ember-auto-imports-test.js', { type: 'test' });
  },

  postprocessTree: function(type, tree){
    let outputFile;
    if (type === 'js'){
      outputFile = 'ember-auto-imports/ember-auto-imports.js';
    } else if (type === 'test') {
      outputFile = 'ember-auto-imports/ember-auto-imports-test.js';
    }

    if (outputFile) {

      // The analyzer is responsible for identifying the set of things
      // that are being imported by app code.
      let analyzer = new Analyzer(tree);

      // The bundler is responsible for determining which imported
      // modules discovered by the analyzer are external NPM packages
      // that need to be handled by auto-import, and packaging them
      // into AMD-loader compatible format.
      //
      // The bundler gets the analyzer's output as input (in order to
      // express their dependency relationship to broccoli). And we
      // also give the bundler a direct reference to the analyzer,
      // because they communicate over their own direct protocol.
      let bundler = new Bundler(analyzer, { analyzer, depFinder: this._depFinder } );

      bundler = debugTree(bundler, 'bundler');

      // The bundler generates one file per imported module, here we
      // combine them into a single file so we can share a single
      // constant app.import.
      let combined = concat(bundler, {
        outputFile,
        inputFiles: ['**/*'],
        sourceMapConfig: { enabled: true },
        allowNone: true
      });

      combined = debugTree(combined, 'combined');

      tree = new MergeTrees([
        tree,
        combined
      ]);
    }
    return tree;
  }
};

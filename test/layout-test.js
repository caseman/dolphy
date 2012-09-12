'use strict';
var chai = require('chai');
var assert = chai.assert;

var requirejs = require('requirejs');
requirejs.config({baseUrl: 'js', nodeRequire: requirejs});

var dolphyTest = function(name, moduleName, func) {
  return test(name, function(done) {
    requirejs([moduleName], function(module) {
      func(module);
      done();
    });
  });
}

suite('layout constructor');

dolphyTest('#Constructor func', 'Layout', function(Layout) {
  assert.isFunction(Layout);
});

dolphyTest('#Returns function', 'Layout', function(Layout) {
  assert.isFunction(Layout([]));
});

suite('invalid layouts');

dolphyTest('#No args', 'Layout', function(Layout) {
  assert.throws(Layout);
});

dolphyTest('#String arg', 'Layout', function(Layout) {
  assert.throws(Layout, 'fooey');
});

dolphyTest('#Number arg', 'Layout', function(Layout) {
  assert.throws(Layout, 1234);
});

suite('render empty layouts');

dolphyTest('#Empty array', 'Layout', function(Layout) {
  var L = Layout([]);
  assert.strictEqual(L(), '');
});

suite('render literals');

dolphyTest('#single string', 'Layout', function(Layout) {
  var L = Layout(['Hat and Beard']);
  assert.strictEqual(L(), 'Hat and Beard');
});

dolphyTest('#string with quotes', 'Layout', function(Layout) {
  var L = Layout(["O'Higgins O'Doules"]);
  assert.strictEqual(L(), "O'Higgins O'Doules");
});

dolphyTest('#string with double quotes', 'Layout', function(Layout) {
  var L = Layout(['Air "quotes"']);
  assert.strictEqual(L(), 'Air "quotes"');
});

dolphyTest('#string with newlines', 'Layout', function(Layout) {
  var L = Layout(['Line 1\nLine 2\n\nLine3']);
  assert.strictEqual(L(), 'Line 1\nLine 2\n\nLine3');
});

dolphyTest('#string with backslash escapes', 'Layout', function(Layout) {
  var L = Layout(['\ \\ \\n']);
  assert.strictEqual(L(), ' \\ \\n');
});

dolphyTest('#multi string', 'Layout', function(Layout) {
  var L = Layout(['Hat and Beard', 'On Green Dolphin Street', 'Out to Lunch']);
  assert.strictEqual(L(), 
    'Hat and Beard\nOn Green Dolphin Street\nOut to Lunch');
});

dolphyTest('#single number', 'Layout', function(Layout) {
  var L = Layout([567]);
  assert.strictEqual(L(), '567');
});

dolphyTest('#multi number', 'Layout', function(Layout) {
  var L = Layout([222, 899, 34]);
  assert.strictEqual(L(), '222\n899\n34');
});

dolphyTest('#stringifyable object', 'Layout', function(Layout) {
  var o = {toString: function() {return 'stringified'}};
  var L = Layout([o]);
  assert.strictEqual(L(), 'stringified');
});

dolphyTest('#mixed literals', 'Layout', function(Layout) {
  var o = {toString: function() {return 'an Object'}};
  var L = Layout(['A string', 420, o]);
  assert.strictEqual(L(), 'A string\n420\nan Object');
});

suite('handler');

dolphyTest('#custom handler', 'Layout', function(Layout) {
  Layout.addHandler(function mrAwesomeHandler(node, compiler) {
    if (node.mrAwesomeHandler) {
      compiler.pushLiteral('Awesome');
    } else {
      compiler.pushLiteral('less awesome');
    }
  });
  var L = Layout(
    [{mrAwesomeHandler: true}, {mrAwesomeHandler: false}]
  );
  assert.strictEqual(L(), 'Awesome\nless awesome');
});

dolphyTest('#unhandled node', 'Layout', function(Layout) {
  assert.throws(Layout, {$someUnknownThingy: 'hey'});
});
dolphyTest('#empty node', 'Layout', function(Layout) {
  assert.throws(Layout, {});
});


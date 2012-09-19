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

dolphyTest('#custom handler function', 'Layout', function(Layout) {
  Layout.addHandler(function mrAwesomeHandler(node) {
    if (node.mrAwesomeHandler) {
      this.pushLiteral('Awesome');
    } else {
      this.pushLiteral('less awesome');
    }
  });
  var L = Layout(
    [{mrAwesomeHandler: true}, {mrAwesomeHandler: false}]
  );
  assert.strictEqual(L(), 'Awesome\nless awesome');
});

dolphyTest('#multiple custom handlers', 'Layout', function(Layout) {
  Layout.addHandler({
    $testFooThingy: function(node) {
      this.pushLiteral('foo');
    },
    $testBarThingy: function(node) {
      this.pushLiteral('BAR');
    }
  });
  var L = Layout(
    [{$testFooThingy: true}, {$testBarThingy: true}]
  );
  assert.strictEqual(L(), 'foo\nBAR');
});

dolphyTest('#unhandled node', 'Layout', function(Layout) {
  assert.throws(Layout, {$someUnknownThingy: 'hey'});
});

dolphyTest('#empty node', 'Layout', function(Layout) {
  assert.throws(Layout, {});
});

suite('tag handler');

dolphyTest('#basic tag', 'Layout', function(Layout) {      
  var L = Layout({tag: 'div'});
  assert.strictEqual(L(), '<div>\n</div>');
});

dolphyTest('#self closing tag', 'Layout', function(Layout) {
  var L = Layout({tag: 'br'});
  assert.strictEqual(L(), '<br>');
});

dolphyTest('#tag id', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', id:'alto'});
  assert.strictEqual(L(), '<div id="alto">\n</div>');
});

dolphyTest('#tag id escape', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', id:'"<foo'});
  assert.strictEqual(L(), '<div id="&quot;&lt;foo">\n</div>');
});

dolphyTest('#tag single class', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:'beard'});
  assert.strictEqual(L(), '<div class="beard">\n</div>');
});

dolphyTest('#tag class escape', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:'<&foo'});
  assert.strictEqual(L(), '<div class="&lt;&amp;foo">\n</div>');
});

dolphyTest('#tag multiple class', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:['hat', 'beard', 'keys']});
  assert.strictEqual(L(), '<div class="hat beard keys">\n</div>');
});

dolphyTest('#tag name value', 'Layout', function(Layout) {
  var html = Layout({tag: 'input', name:'eric', value:'saxman'})();
  assert.strictEqual(html.slice(0, 7), '<input ');
  assert(html.indexOf(' name="eric"') > -1, html);
  assert(html.indexOf(' value="saxman"') > -1, html);
});

dolphyTest('#tag other attr', 'Layout', function(Layout) {
  var html = Layout({tag: 'input', attr: {type: 'checkbox'}})();
  assert.strictEqual(html.slice(0, 7), '<input ');
  assert(html.indexOf(' type="checkbox"') > -1, html);
});

dolphyTest('#tag bool attr true', 'Layout', function(Layout) {
  var L = Layout({tag: 'input', attr: {checked: true}});
  assert.strictEqual(L(), '<input checked>');
});

dolphyTest('#tag bool attr false', 'Layout', function(Layout) {
  var L = Layout({tag: 'input', attr: {checked: false}});
  assert.strictEqual(L(), '<input>');
});

dolphyTest('#tag other attr escape', 'Layout', function(Layout) {
  var html = Layout({tag: 'input', attr: {'data-stuff': '<html>'}})();
  assert(html.indexOf(' data-stuff="&lt;html&gt;"') > -1, html);
});

dolphyTest('#tag multi attr', 'Layout', function(Layout) {
  var html = Layout({tag: 'label', attr: {'for': 'you', 'data-foo': 'bar'}})();
  assert.strictEqual(html.slice(0, 7), '<label ');
  assert(html.indexOf(' for="you"') > -1, html);
  assert(html.indexOf(' data-foo="bar"') > -1, html);
});

dolphyTest('#tag literal content', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', content:'Avant garde'});
  assert.strictEqual(L(), '<div>\nAvant garde\n</div>');
});

dolphyTest('#tag nested content', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', content:[
    {tag: 'hr'},
    {tag: 'p', cls:'hepcat', content:[
      'Far', {tag: 'b', content:'out'}
    ]}
  ]});
  assert.strictEqual(L(), '<div>\n<hr>\n<p class="hepcat">\nFar\n<b>\nout\n</b>\n</p>\n</div>');
});




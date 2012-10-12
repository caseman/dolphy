'use strict';
var chai = require('chai');
var assert = chai.assert;

var requirejs = require('requirejs');
requirejs.config({baseUrl: 'js'});

var layoutTest = function(name, func) {
  return test(name, function(done) {
    requirejs(['Layout'], function(Layout) {
      func(Layout);
      done();
    });
  });
}

suite('layout constructor');

test('#Constructor func CommonJS', function() {
  var Layout = require('../js/Layout.js');
  assert.isFunction(Layout);
});

layoutTest('#Constructor func AMD', function(Layout) {
  assert.isFunction(Layout);
});

layoutTest('#Returns function', function(Layout) {
  assert.isFunction(Layout([]));
});

suite('invalid layouts');

layoutTest('#No args', function(Layout) {
  assert.throws(Layout);
});

layoutTest('#String arg', function(Layout) {
  assert.throws(Layout, 'fooey');
});

layoutTest('#Number arg', function(Layout) {
  assert.throws(Layout, 1234);
});

suite('render empty layouts');

layoutTest('#Empty array', function(Layout) {
  var L = Layout([]);
  assert.strictEqual(L(), '');
});

suite('render literals');

layoutTest('#single string', function(Layout) {
  var L = Layout(['Hat and Beard']);
  assert.strictEqual(L(), 'Hat and Beard');
});

layoutTest('#string with quotes', function(Layout) {
  var L = Layout(["O'Higgins O'Doules"]);
  assert.strictEqual(L(), "O'Higgins O'Doules");
});

layoutTest('#string with double quotes', function(Layout) {
  var L = Layout(['Air "quotes"']);
  assert.strictEqual(L(), 'Air "quotes"');
});

layoutTest('#string with newlines', function(Layout) {
  var L = Layout(['Line 1\nLine 2\n\nLine3']);
  assert.strictEqual(L(), 'Line 1\nLine 2\n\nLine3');
});

layoutTest('#string with backslash escapes', function(Layout) {
  var L = Layout(['\ \\ \\n']);
  assert.strictEqual(L(), ' \\ \\n');
});

layoutTest('#multi string', function(Layout) {
  var L = Layout(['Hat and Beard', 'On Green Dolphin Street', 'Out to Lunch']);
  assert.strictEqual(L(), 
    'Hat and Beard\nOn Green Dolphin Street\nOut to Lunch');
});

layoutTest('#single number', function(Layout) {
  var L = Layout([567]);
  assert.strictEqual(L(), '567');
});

layoutTest('#multi number', function(Layout) {
  var L = Layout([222, 899, 34]);
  assert.strictEqual(L(), '222\n899\n34');
});

layoutTest('#stringifyable object', function(Layout) {
  var o = {toString: function() {return 'stringified'}};
  var L = Layout([o]);
  assert.strictEqual(L(), 'stringified');
});

layoutTest('#mixed literals', function(Layout) {
  var o = {toString: function() {return 'an Object'}};
  var L = Layout(['A string', 420, o]);
  assert.strictEqual(L(), 'A string\n420\nan Object');
});

suite('handler');

layoutTest('#custom handler function', function(Layout) {
  Layout.addHandler(function mrAwesomeHandler(node) {
    if (node.mrAwesomeHandler) {
      return '"Awesome"';
    } else {
      return '"less awesome"';
    }
  });
  var L = Layout(
    [{mrAwesomeHandler: true}, {mrAwesomeHandler: false}]
  );
  assert.strictEqual(L(), 'Awesome\nless awesome');
});

layoutTest('#multiple custom handlers', function(Layout) {
  Layout.addHandler([
    function $testFooThingy(node) {
      return '"foo"';
    },
    function $testBarThingy(node) {
      return '"BAR"';
    }
  ]);
  var L = Layout(
    [{$testFooThingy: true}, {$testBarThingy: true}]
  );
  assert.strictEqual(L(), 'foo\nBAR');
});

layoutTest('#multiple custom handlers are ordered', function(Layout) {
  Layout.addHandler([
    function $testFirstOne(node) {
      return '"1"';
    },
    function $testSecondOne(node) {
      return '"2"';
    },
    function $testThirdOne(node) {
      return '"3"';
    }
  ]);
  var L = Layout(
    [{$testThirdOne: true}, 
     {$testFirstOne: true, $testThirdOne: true},
     {$testFirstOne: true, $testSecondOne: true}, 
     {$testSecondOne: true, $testThirdOne: true},
     {$testFirstOne: true}, 
     {$testSecondOne: true}]
  );
  assert.strictEqual(L(), '3\n1\n1\n2\n1\n2');
});

layoutTest('#unhandled node', function(Layout) {
  assert.throws(Layout, {$someUnknownThingy: 'hey'});
});

layoutTest('#empty node', function(Layout) {
  assert.throws(Layout, {});
});

suite('tag handler');

layoutTest('#basic tag', function(Layout) {      
  var L = Layout({tag: 'div'});
  assert.strictEqual(L(), '<div></div>');
});

layoutTest('#self closing tag', function(Layout) {
  var L = Layout({tag: 'br'});
  assert.strictEqual(L(), '<br>');
});

layoutTest('#tag id', function(Layout) {
  var L = Layout({tag: 'div', id:'alto'});
  assert.strictEqual(L(), '<div id="alto"></div>');
});

layoutTest('#tag id escape', function(Layout) {
  var L = Layout({tag: 'div', id:'"<foo'});
  assert.strictEqual(L(), '<div id="&quot;&lt;foo"></div>');
});

layoutTest('#tag single class', function(Layout) {
  var L = Layout({tag: 'div', cls:'beard'});
  assert.strictEqual(L(), '<div class="beard"></div>');
});

layoutTest('#tag class escape', function(Layout) {
  var L = Layout({tag: 'div', cls:'<&foo'});
  assert.strictEqual(L(), '<div class="&lt;&amp;foo"></div>');
});

layoutTest('#tag multiple class', function(Layout) {
  var L = Layout({tag: 'div', cls:['hat', 'beard', 'keys']});
  assert.strictEqual(L(), '<div class="hat beard keys"></div>');
});

layoutTest('#tag name value', function(Layout) {
  var html = Layout({tag: 'input', name:'eric', value:'saxman'})();
  assert.strictEqual(html.slice(0, 7), '<input ');
  assert(html.indexOf(' name="eric"') > -1, html);
  assert(html.indexOf(' value="saxman"') > -1, html);
});

layoutTest('#tag other attr', function(Layout) {
  var html = Layout({tag: 'input', attr: {type: 'checkbox'}})();
  assert.strictEqual(html.slice(0, 7), '<input ');
  assert(html.indexOf(' type="checkbox"') > -1, html);
});

layoutTest('#tag bool attr true', function(Layout) {
  var L = Layout({tag: 'input', attr: {checked: true}});
  assert.strictEqual(L(), '<input checked>');
});

layoutTest('#tag bool attr false', function(Layout) {
  var L = Layout({tag: 'input', attr: {checked: false}});
  assert.strictEqual(L(), '<input>');
});

layoutTest('#tag other attr escape', function(Layout) {
  var html = Layout({tag: 'input', attr: {'data-stuff': '<html>'}})();
  assert(html.indexOf(' data-stuff="&lt;html&gt;"') > -1, html);
});

layoutTest('#tag multi attr', function(Layout) {
  var html = Layout({tag: 'label', attr: {'for': 'you', 'data-foo': 'bar'}})();
  assert.strictEqual(html.slice(0, 7), '<label ');
  assert(html.indexOf(' for="you"') > -1, html);
  assert(html.indexOf(' data-foo="bar"') > -1, html);
});

layoutTest('#tag literal content', function(Layout) {
  var L = Layout({tag: 'div', content:'Avant garde'});
  assert.strictEqual(L(), '<div>Avant garde</div>');
});

layoutTest('#tag omit empty', function(Layout) {
  var L = Layout({tag: 'div', omitEmpty: true, content: {expr: 'bleah'}});
  assert.strictEqual(L({'bleah': 'eh?'}), '<div>eh?</div>');
  assert.strictEqual(L({'bleah': ''}), '');
  assert.strictEqual(L({'bleah': undefined}), '');
  assert.strictEqual(L({'bleah': null}), '');
});

layoutTest('#tag nested content', function(Layout) {
  var L = Layout({tag: 'div', content:[
    {tag: 'hr'},
    {tag: 'p', cls:'hepcat', content:[
      'Far', {tag: 'b', content:'out'}
    ]}
  ]});
  assert.strictEqual(L(), '<div><hr>\n<p class="hepcat">Far\n<b>out</b></p></div>');
});

suite("Expr handler");

layoutTest('#constants', function(Layout) {
  var cases = [true, 1, 'foo', -2.3];
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var L = Layout({tag:'div', content:{expr: JSON.stringify(c)}});
    assert.strictEqual(L(), '<div>' + c + '</div>');
  }
});

layoutTest('#arithmetic', function(Layout) {
  var L = Layout({tag:'div', content:{expr: '3 * (4 + 1)'}});
  assert.strictEqual(L(), '<div>15</div>');
});

layoutTest('#comparison', function(Layout) {
  var L = Layout({tag:'div', content:{expr: '"40" === "4" + "0"'}});
  assert.strictEqual(L(), '<div>true</div>');
});

layoutTest('#var from context', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text'}});
  assert.strictEqual(L({'text': 'hummina'}), '<div>hummina</div>');
});

layoutTest('#var reference error', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text'}});
  assert.throws(function() {L()}, ReferenceError);
});

layoutTest('#escaped implicit', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"'}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&amp;42&lt;yadda&gt;</div>');
});

layoutTest('#escaped explicit', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"', escape:true}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&amp;42&lt;yadda&gt;</div>');
});

layoutTest('#not escaped', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"', escape:false}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&42<yadda></div>');
});

layoutTest('#attr escaped', function(Layout) {
  var L = Layout({tag:'input', value:{expr: '"<" + value + ">"'}});
  assert.strictEqual(L({'value': 'foo&bar'}), '<input value="&lt;foo&amp;bar&gt;">');
});

layoutTest('#attr omit empty', function(Layout) {
  var L = Layout({tag:'div', cls:{expr: 'cls', omitEmpty: true}});
  assert.strictEqual(L({'cls': 'bleah'}), '<div class="bleah"></div>');
  assert.strictEqual(L({'cls': ''}), '<div></div>');
  assert.strictEqual(L({'cls': null}), '<div></div>');
  assert.strictEqual(L({'cls': false}), '<div></div>');
  assert.strictEqual(L({'cls': undefined}), '<div></div>');
});

layoutTest('#syntax error', function(Layout) {
  assert.throws(function() {Layout({expr: '5 !+ 4'})}, SyntaxError);
});

layoutTest('#multi statement error', function(Layout) {
  assert.throws(function() {Layout({expr: '"foo"; "bar"'})}, SyntaxError);
});

layoutTest('#redundant properties error', function(Layout) {
  assert.throws(function() {Layout({expr: '{a:1, a:2}'})}, SyntaxError);
});

layoutTest('#error includes expr', function(Layout) {
  assert.throws(function() {Layout({expr: '"foobar'})}, /"foobar/);
});

suite("Test handler");

layoutTest('#no extra properties', function(Layout) {
  assert.throws(function() {Layout({test:'false'});
  });
});

layoutTest('#yes/no', function(Layout) {
  var L = Layout({test:'wat', yes:"True Dat!", no: "No No No!"});
  assert.strictEqual(L({wat: true}), 'True Dat!');
  assert.strictEqual(L({wat: false}), 'No No No!');
});

layoutTest('#yes only', function(Layout) {
  var L = Layout({test:'wat', yes:"True Dat!"});
  assert.strictEqual(L({wat: true}), 'True Dat!');
  assert.strictEqual(L({wat: false}), '');
});

layoutTest('#no only', function(Layout) {
  var L = Layout({test:'wat', no: "No No No!"});
  assert.strictEqual(L({wat: true}), '');
  assert.strictEqual(L({wat: false}), 'No No No!');
});

layoutTest('#yes/no extra properties', function(Layout) {
  assert.throws(function() {
    Layout({test:'false', yes:"YES", no: "NO", plural:"HUH?"});
  });
});

layoutTest('#empty/notEmpty', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty?', notEmpty:'Not So Empty'});
  assert.strictEqual(L({stuff: []}), 'Empty?');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Not So Empty');
});

layoutTest('#empty only', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty!'});
  assert.strictEqual(L({stuff: []}), 'Empty!');
  assert.strictEqual(L({stuff: [1,2,3]}), '');
});

layoutTest('#notEmpty only', function(Layout) {
  var L = Layout({test:'stuff', notEmpty:'Not Empty'});
  assert.strictEqual(L({stuff: []}), '');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Not Empty');
});

layoutTest('#empty/notEmpty not array', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty?', notEmpty:'Not So Empty'});
  assert.strictEqual(L({stuff: ''}), '');
  assert.strictEqual(L({stuff: 'stuff'}), '');
});

layoutTest('#syntax error', function(Layout) {
  assert.throws(function() {Layout({test: '5 !+ 4', yes:'ohno'})}, SyntaxError);
});

layoutTest('#expr evaluated once', function(Layout) {
  var L = Layout({test:'a.push(1), a', notEmpty:'good'});
  var a = [];
  L({a: a});
  assert.deepEqual(a, [1]);
});

layoutTest('#singular/plural/none array', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many', none:'None'});
  assert.strictEqual(L({stuff: [1]}), 'One');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Many');
  assert.strictEqual(L({stuff: []}), 'None');
});

layoutTest('#singular/plural array', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many'});
  assert.strictEqual(L({stuff: [1]}), 'One');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Many');
  assert.strictEqual(L({stuff: []}), 'Many');
});

layoutTest('#singular/plural/none number', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many', none:'None'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 3}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'None');
});

layoutTest('#singular/plural number', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 5}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'Many');
});

layoutTest('#singular only', function(Layout) {
  var L = Layout({test:'stuff', singular:'One'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 3}), '');
  assert.strictEqual(L({stuff: 0}), '');
});

layoutTest('#plural only', function(Layout) {
  var L = Layout({test:'stuff', plural:'Many'});
  assert.strictEqual(L({stuff: 1}), '');
  assert.strictEqual(L({stuff: 5}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'Many');
});

layoutTest('#none only', function(Layout) {
  var L = Layout({test:'stuff', none:'Nothing'});
  assert.strictEqual(L({stuff: 1}), '');
  assert.strictEqual(L({stuff: 5}), '');
  assert.strictEqual(L({stuff: 0}), 'Nothing');
});

suite('each handler');

layoutTest('#literal content', function(Layout) {
  var L = Layout({each:'[1,2,3]', content:'gooche'});
  assert.strictEqual(L(), 'gooche\ngooche\ngooche');
});

layoutTest('#content $item', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{expr: '$item - 1'}});
  assert.strictEqual(L(), '2\n1\n0');
});

layoutTest('#content $index', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{expr: '$index'}});
  assert.strictEqual(L(), '0\n1\n2');
});

layoutTest('#itemVar', function(Layout) {
  var L = Layout({each:'[4,8,1]', itemVar:'foobar', content:{expr: 'foobar+1'}});
  assert.strictEqual(L(), '5\n9\n2');
});

layoutTest('#indexVar', function(Layout) {
  var L = Layout({each:'[4,8,1]', indexVar:'bizbaz', content:{expr: 'bizbaz*2'}});
  assert.strictEqual(L(), '0\n2\n4');
});

layoutTest('#first', function(Layout) {
  var L = Layout({each:'[3,2,1]', first:{expr:'"first" + $index'}, content:{expr: '$index'}});
  assert.strictEqual(L(), 'first0\n0\n1\n2');
});

layoutTest('#first empty', function(Layout) {
  var L = Layout({each:'[]', first:'first', content:{expr: '$index'}});
  assert.strictEqual(L(), '');
});

layoutTest('#last', function(Layout) {
  var L = Layout({each:'[3,2,1]', last:{expr:'"last" + $index'}, content:{expr: '$index'}});
  assert.strictEqual(L(), '0\n1\n2\nlast2');
});

layoutTest('#last empty', function(Layout) {
  var L = Layout({each:'[]', last:'last', content:{expr: '$index'}});
  assert.strictEqual(L(), '');
});

layoutTest('#iterable expr', function(Layout) {
  var L = Layout({each:'iterable', content:{expr: '$item'}});
  assert.strictEqual(L({iterable: ['foo', 'bar']}), 'foo\nbar');
  assert.strictEqual(L({iterable: ['groucho', 'harpo', 'zeppo']}), 'groucho\nharpo\nzeppo');
  assert.strictEqual(L({iterable: []}), '');
});

layoutTest('#complex content', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{tag: 'input', value: {expr: '$item'}}});
  assert.strictEqual(L(['foo', 'bar']), 
    '<input value="3">\n<input value="2">\n<input value="1">');
});

layoutTest('#extra properties', function(Layout) {
  assert.throws(function() {
    Layout({each:'[]', foobar:false}); 
  });
});

layoutTest('#filter', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5,6]', filter:'$item % 2 === 0', content:{expr: '$item'}});
  assert.strictEqual(L(), '2\n4\n6');
});

layoutTest('#filter omits all', function(Layout) {
  var L = Layout({each:'[1,2,3]', filter:'$item > 3', content:{expr: '$item'}});
  assert.strictEqual(L(), '');
});

layoutTest('#filter first', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5]', filter:'$item > 3', 
    first:{expr: '"first " + $item'}, content:{expr: '$item'}});
  assert.strictEqual(L(), 'first 4\n4\n5');
});

layoutTest('#filter last', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5]', filter:'$item < 3', 
    last:{expr: '"last " + $item'}, content:{expr: '$item'}});
  assert.strictEqual(L(), '1\n2\nlast 2');
});

suite('slot/use handlers');

layoutTest('#basic slot', function(Layout) {
  var L1 = Layout({tag:'div', id:{slot:'id'}, cls:{slot:'cls'}, content:{slot:'stuff'}});
  var L2 = Layout({use:L1, id:'mememe', 
    cls:['foo', 'bar', 'spam'], stuff:{tag:'p', content:'Woo'}});
  assert.strictEqual(L2(), '<div id="mememe" class="foo bar spam"><p>Woo</p></div>');
});

layoutTest('#slot precidence', function(Layout) {
  var L1 = Layout([{slot:'tag'}, {slot:'expr'}, {slot:'test'}, {slot:'each'}, {slot:'slot'}]);
  var L2 = Layout({use:L1, tag:'TAG', expr:'EXPR', test:'TEST', each:'EACH', slot:'SLOT'})
  assert.strictEqual(L2(), 'TAG\nEXPR\nTEST\nEACH\nSLOT');
});

layoutTest('#slot metadata', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id'}, cls:{slot:'cls', escape:true}, 
    content:{slot:'content', required:true}});
  assert.strictEqual(L.slots.length, 3);

  assert.strictEqual(L.slots[0].slot, 'id');
  assert.strictEqual(L.slots[0].escape, undefined);
  assert.strictEqual(L.slots[0].required, undefined);

  assert.strictEqual(L.slots[1].slot, 'cls');
  assert.strictEqual(L.slots[1].escape, true);
  assert.strictEqual(L.slots[1].required, undefined);

  assert.strictEqual(L.slots[2].slot, 'content');
  assert.strictEqual(L.slots[2].escape, undefined);
  assert.strictEqual(L.slots[2].required, true);
});

layoutTest('#required slot', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id'}, content:{slot:'content', required:true}});
  assert.throws(function() {Layout({use:L})}, /required/);
  Layout({use:L, content:'UhHuh'});
});

layoutTest('#invalid slot', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id'}, content:{slot:'content'}});
  assert.throws(function() {Layout({use:L, foobar:'yo'})}, /foobar/);
});

layoutTest('#slot escape explicit', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content', escape:true}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div>&lt;*&amp;34abc&gt;</div>');
});

layoutTest('#slot escape implicit', function(Layout) {
  var L1 = Layout({tag:'div', id:{slot:'id'}});
  var L2 = Layout({use:L1, id:'<*&34abc>'});
  assert.strictEqual(L2(), '<div id="&lt;*&amp;34abc&gt;"></div>');
});

layoutTest('#slot no escape explicit', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content', escape:false}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div><*&34abc></div>');
});

layoutTest('#slot no escape implicit', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content'}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div><*&34abc></div>');
});

layoutTest('#multi slot', function(Layout) {
  var L1 = Layout({tag:'a', attr:{href:{slot:'href'}}, content:{slot:'href'}});
  var L2 = Layout({use:L1, href:'http://www.pandora.com/'});
  assert.strictEqual(L2(), '<a href="http://www.pandora.com/">http://www.pandora.com/</a>');
});

layoutTest('#omitted slot no default', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content'}});
  var L2 = Layout({use:L1});
  assert.strictEqual(L2(), '<div></div>');
});

layoutTest('#omitted slot default', function(Layout) {
  var L1 = Layout({tag:'div', 
    content:{slot:'content', default:{tag:'b', content:'Bold by Default'}}});
  var L2 = Layout({use:L1});
  assert.strictEqual(L2(), '<div><b>Bold by Default</b></div>');
});

layoutTest('#slot default and required', function(Layout) {
  assert.throws(function() {
    Layout({tag:'div', content:{slot:'content', default:'bleah', required:true}});
  }, /default and required/);
});

layoutTest('#slot omit empty', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id', omitEmpty:true}});
  assert.strictEqual(Layout({use:L})(), '<div></div>');
  assert.strictEqual(Layout({use:L, id:'mythingy'})(), '<div id="mythingy"></div>');
});


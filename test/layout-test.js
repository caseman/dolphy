'use strict';
var chai = require('chai');
var assert = chai.assert;

var requirejs = require('requirejs');
requirejs.config({baseUrl: 'js'});

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

dolphyTest('#multiple custom handlers', 'Layout', function(Layout) {
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

dolphyTest('#multiple custom handlers are ordered', 'Layout', function(Layout) {
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

dolphyTest('#unhandled node', 'Layout', function(Layout) {
  assert.throws(Layout, {$someUnknownThingy: 'hey'});
});

dolphyTest('#empty node', 'Layout', function(Layout) {
  assert.throws(Layout, {});
});

suite('tag handler');

dolphyTest('#basic tag', 'Layout', function(Layout) {      
  var L = Layout({tag: 'div'});
  assert.strictEqual(L(), '<div></div>');
});

dolphyTest('#self closing tag', 'Layout', function(Layout) {
  var L = Layout({tag: 'br'});
  assert.strictEqual(L(), '<br>');
});

dolphyTest('#tag id', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', id:'alto'});
  assert.strictEqual(L(), '<div id="alto"></div>');
});

dolphyTest('#tag id escape', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', id:'"<foo'});
  assert.strictEqual(L(), '<div id="&quot;&lt;foo"></div>');
});

dolphyTest('#tag single class', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:'beard'});
  assert.strictEqual(L(), '<div class="beard"></div>');
});

dolphyTest('#tag class escape', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:'<&foo'});
  assert.strictEqual(L(), '<div class="&lt;&amp;foo"></div>');
});

dolphyTest('#tag multiple class', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', cls:['hat', 'beard', 'keys']});
  assert.strictEqual(L(), '<div class="hat beard keys"></div>');
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
  assert.strictEqual(L(), '<div>Avant garde</div>');
});

dolphyTest('#tag omit empty', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', omitEmpty: true, content: {expr: 'bleah'}});
  assert.strictEqual(L({'bleah': 'eh?'}), '<div>eh?</div>');
  assert.strictEqual(L({'bleah': ''}), '');
  assert.strictEqual(L({'bleah': undefined}), '');
  assert.strictEqual(L({'bleah': null}), '');
});

dolphyTest('#tag nested content', 'Layout', function(Layout) {
  var L = Layout({tag: 'div', content:[
    {tag: 'hr'},
    {tag: 'p', cls:'hepcat', content:[
      'Far', {tag: 'b', content:'out'}
    ]}
  ]});
  assert.strictEqual(L(), '<div><hr>\n<p class="hepcat">Far\n<b>out</b></p></div>');
});

suite("Expr handler");

dolphyTest('#constants', 'Layout', function(Layout) {
  var cases = [true, 1, 'foo', -2.3];
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var L = Layout({tag:'div', content:{expr: JSON.stringify(c)}});
    assert.strictEqual(L(), '<div>' + c + '</div>');
  }
});

dolphyTest('#arithmetic', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: '3 * (4 + 1)'}});
  assert.strictEqual(L(), '<div>15</div>');
});

dolphyTest('#comparison', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: '"40" === "4" + "0"'}});
  assert.strictEqual(L(), '<div>true</div>');
});

dolphyTest('#var from context', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text'}});
  assert.strictEqual(L({'text': 'hummina'}), '<div>hummina</div>');
});

dolphyTest('#var reference error', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text'}});
  assert.throws(function() {L()}, ReferenceError);
});

dolphyTest('#escaped implicit', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"'}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&amp;42&lt;yadda&gt;</div>');
});

dolphyTest('#escaped explicit', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"', escape:true}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&amp;42&lt;yadda&gt;</div>');
});

dolphyTest('#not escaped', 'Layout', function(Layout) {
  var L = Layout({tag:'div', content:{expr: 'text + "yadda>"', escape:false}});
  assert.strictEqual(L({'text': '&42<'}), '<div>&42<yadda></div>');
});

dolphyTest('#attr escaped', 'Layout', function(Layout) {
  var L = Layout({tag:'input', value:{expr: '"<" + value + ">"'}});
  assert.strictEqual(L({'value': 'foo&bar'}), '<input value="&lt;foo&amp;bar&gt;">');
});

dolphyTest('#attr omit empty', 'Layout', function(Layout) {
  var L = Layout({tag:'div', cls:{expr: 'cls', omitEmpty: true}});
  assert.strictEqual(L({'cls': 'bleah'}), '<div class="bleah"></div>');
  assert.strictEqual(L({'cls': ''}), '<div></div>');
  assert.strictEqual(L({'cls': null}), '<div></div>');
  assert.strictEqual(L({'cls': false}), '<div></div>');
  assert.strictEqual(L({'cls': undefined}), '<div></div>');
});

dolphyTest('#syntax error', 'Layout', function(Layout) {
  assert.throws(function() {Layout({expr: '5 !+ 4'})}, SyntaxError);
});

dolphyTest('#multi statement error', 'Layout', function(Layout) {
  assert.throws(function() {Layout({expr: '"foo"; "bar"'})}, SyntaxError);
});

dolphyTest('#redundant properties error', 'Layout', function(Layout) {
  assert.throws(function() {Layout({expr: '{a:1, a:2}'})}, SyntaxError);
});

dolphyTest('#error includes expr', 'Layout', function(Layout) {
  assert.throws(function() {Layout({expr: '"foobar'})}, /"foobar/);
});

suite("Test handler");

dolphyTest('#no extra properties', 'Layout', function(Layout) {
  assert.throws(function() {Layout({test:'false'});
  });
});

dolphyTest('#yes/no', 'Layout', function(Layout) {
  var L = Layout({test:'wat', yes:"True Dat!", no: "No No No!"});
  assert.strictEqual(L({wat: true}), 'True Dat!');
  assert.strictEqual(L({wat: false}), 'No No No!');
});

dolphyTest('#yes only', 'Layout', function(Layout) {
  var L = Layout({test:'wat', yes:"True Dat!"});
  assert.strictEqual(L({wat: true}), 'True Dat!');
  assert.strictEqual(L({wat: false}), '');
});

dolphyTest('#no only', 'Layout', function(Layout) {
  var L = Layout({test:'wat', no: "No No No!"});
  assert.strictEqual(L({wat: true}), '');
  assert.strictEqual(L({wat: false}), 'No No No!');
});

dolphyTest('#yes/no extra properties', 'Layout', function(Layout) {
  assert.throws(function() {
    Layout({test:'false', yes:"YES", no: "NO", plural:"HUH?"});
  });
});

dolphyTest('#empty/notEmpty', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty?', notEmpty:'Not So Empty'});
  assert.strictEqual(L({stuff: []}), 'Empty?');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Not So Empty');
});

dolphyTest('#empty only', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty!'});
  assert.strictEqual(L({stuff: []}), 'Empty!');
  assert.strictEqual(L({stuff: [1,2,3]}), '');
});

dolphyTest('#notEmpty only', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', notEmpty:'Not Empty'});
  assert.strictEqual(L({stuff: []}), '');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Not Empty');
});

dolphyTest('#empty/notEmpty not array', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', empty:'Empty?', notEmpty:'Not So Empty'});
  assert.strictEqual(L({stuff: ''}), '');
  assert.strictEqual(L({stuff: 'stuff'}), '');
});

dolphyTest('#syntax error', 'Layout', function(Layout) {
  assert.throws(function() {Layout({test: '5 !+ 4', yes:'ohno'})}, SyntaxError);
});

dolphyTest('#expr evaluated once', 'Layout', function(Layout) {
  var L = Layout({test:'a.push(1), a', notEmpty:'good'});
  var a = [];
  L({a: a});
  assert.deepEqual(a, [1]);
});

dolphyTest('#singular/plural/none array', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many', none:'None'});
  assert.strictEqual(L({stuff: [1]}), 'One');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Many');
  assert.strictEqual(L({stuff: []}), 'None');
});

dolphyTest('#singular/plural array', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many'});
  assert.strictEqual(L({stuff: [1]}), 'One');
  assert.strictEqual(L({stuff: [1,2,3]}), 'Many');
  assert.strictEqual(L({stuff: []}), 'Many');
});

dolphyTest('#singular/plural/none number', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many', none:'None'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 3}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'None');
});

dolphyTest('#singular/plural number', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', singular:'One', plural:'Many'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 5}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'Many');
});

dolphyTest('#singular only', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', singular:'One'});
  assert.strictEqual(L({stuff: 1}), 'One');
  assert.strictEqual(L({stuff: 3}), '');
  assert.strictEqual(L({stuff: 0}), '');
});

dolphyTest('#plural only', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', plural:'Many'});
  assert.strictEqual(L({stuff: 1}), '');
  assert.strictEqual(L({stuff: 5}), 'Many');
  assert.strictEqual(L({stuff: 0}), 'Many');
});

dolphyTest('#none only', 'Layout', function(Layout) {
  var L = Layout({test:'stuff', none:'Nothing'});
  assert.strictEqual(L({stuff: 1}), '');
  assert.strictEqual(L({stuff: 5}), '');
  assert.strictEqual(L({stuff: 0}), 'Nothing');
});

suite('each handler');

dolphyTest('#literal content', 'Layout', function(Layout) {
  var L = Layout({each:'[1,2,3]', content:'gooche'});
  assert.strictEqual(L(), 'gooche\ngooche\ngooche');
});

dolphyTest('#content $item', 'Layout', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{expr: '$item - 1'}});
  assert.strictEqual(L(), '2\n1\n0');
});

dolphyTest('#content $index', 'Layout', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{expr: '$index'}});
  assert.strictEqual(L(), '0\n1\n2');
});

dolphyTest('#itemVar', 'Layout', function(Layout) {
  var L = Layout({each:'[4,8,1]', itemVar:'foobar', content:{expr: 'foobar+1'}});
  assert.strictEqual(L(), '5\n9\n2');
});

dolphyTest('#indexVar', 'Layout', function(Layout) {
  var L = Layout({each:'[4,8,1]', indexVar:'bizbaz', content:{expr: 'bizbaz*2'}});
  assert.strictEqual(L(), '0\n2\n4');
});

dolphyTest('#first', 'Layout', function(Layout) {
  var L = Layout({each:'[3,2,1]', first:{expr:'"first" + $index'}, content:{expr: '$index'}});
  assert.strictEqual(L(), 'first0\n0\n1\n2');
});

dolphyTest('#first empty', 'Layout', function(Layout) {
  var L = Layout({each:'[]', first:'first', content:{expr: '$index'}});
  assert.strictEqual(L(), '');
});

dolphyTest('#last', 'Layout', function(Layout) {
  var L = Layout({each:'[3,2,1]', last:{expr:'"last" + $index'}, content:{expr: '$index'}});
  assert.strictEqual(L(), '0\n1\n2\nlast2');
});

dolphyTest('#last empty', 'Layout', function(Layout) {
  var L = Layout({each:'[]', last:'last', content:{expr: '$index'}});
  assert.strictEqual(L(), '');
});

dolphyTest('#iterable expr', 'Layout', function(Layout) {
  var L = Layout({each:'iterable', content:{expr: '$item'}});
  assert.strictEqual(L({iterable: ['foo', 'bar']}), 'foo\nbar');
  assert.strictEqual(L({iterable: ['groucho', 'harpo', 'zeppo']}), 'groucho\nharpo\nzeppo');
  assert.strictEqual(L({iterable: []}), '');
});

dolphyTest('#complex content', 'Layout', function(Layout) {
  var L = Layout({each:'[3,2,1]', content:{tag: 'input', value: {expr: '$item'}}});
  assert.strictEqual(L(['foo', 'bar']), 
    '<input value="3">\n<input value="2">\n<input value="1">');
});

dolphyTest('#extra properties', 'Layout', function(Layout) {
  assert.throws(function() {
    Layout({each:'[]', foobar:false}); 
  });
});

dolphyTest('#filter', 'Layout', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5,6]', filter:'$item % 2 === 0', content:{expr: '$item'}});
  assert.strictEqual(L(), '2\n4\n6');
});

dolphyTest('#filter omits all', 'Layout', function(Layout) {
  var L = Layout({each:'[1,2,3]', filter:'$item > 3', content:{expr: '$item'}});
  assert.strictEqual(L(), '');
});

dolphyTest('#filter first', 'Layout', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5]', filter:'$item > 3', 
    first:{expr: '"first " + $item'}, content:{expr: '$item'}});
  assert.strictEqual(L(), 'first 4\n4\n5');
});

dolphyTest('#filter last', 'Layout', function(Layout) {
  var L = Layout({each:'[1,2,3,4,5]', filter:'$item < 3', 
    last:{expr: '"last " + $item'}, content:{expr: '$item'}});
  assert.strictEqual(L(), '1\n2\nlast 2');
});

suite('slot/use handlers');

dolphyTest('#basic slot', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', id:{slot:'id'}, cls:{slot:'cls'}, content:{slot:'stuff'}});
  var L2 = Layout({use:L1, id:'mememe', 
    cls:['foo', 'bar', 'spam'], stuff:{tag:'p', content:'Woo'}});
  assert.strictEqual(L2(), '<div id="mememe" class="foo bar spam"><p>Woo</p></div>');
});

dolphyTest('#slot metadata', 'Layout', function(Layout) {
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

dolphyTest('#required slot', 'Layout', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id'}, content:{slot:'content', required:true}});
  assert.throws(function() {Layout({use:L})}, /required/);
  Layout({use:L, content:'UhHuh'});
});

dolphyTest('#invalid slot', 'Layout', function(Layout) {
  var L = Layout({tag:'div', id:{slot:'id'}, content:{slot:'content'}});
  assert.throws(function() {Layout({use:L, foobar:'yo'})}, /foobar/);
});

dolphyTest('#slot escape explicit', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content', escape:true}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div>&lt;*&amp;34abc&gt;</div>');
});

dolphyTest('#slot escape implicit', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', id:{slot:'id'}});
  var L2 = Layout({use:L1, id:'<*&34abc>'});
  assert.strictEqual(L2(), '<div id="&lt;*&amp;34abc&gt;"></div>');
});

dolphyTest('#slot no escape explicit', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content', escape:false}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div><*&34abc></div>');
});

dolphyTest('#slot no escape implicit', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content'}});
  var L2 = Layout({use:L1, content:'<*&34abc>'});
  assert.strictEqual(L2(), '<div><*&34abc></div>');
});

dolphyTest('#multi slot', 'Layout', function(Layout) {
  var L1 = Layout({tag:'a', attr:{href:{slot:'href'}}, content:{slot:'href'}});
  var L2 = Layout({use:L1, href:'http://www.pandora.com/'});
  assert.strictEqual(L2(), '<a href="http://www.pandora.com/">http://www.pandora.com/</a>');
});

dolphyTest('#omitted slot no default', 'Layout', function(Layout) {
  var L1 = Layout({tag:'div', content:{slot:'content'}});
  var L2 = Layout({use:L1});
  assert.strictEqual(L2(), '<div></div>');
});


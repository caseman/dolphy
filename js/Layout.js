define(function() {
  'use strict';
  var 
    isArray = Array.isArray,
    _objToString = Object.prototype.toString,
    stringify = JSON.stringify;

  function isObject(obj) {
    return _objToString.call(obj) === '[object Object]';
  };

  function splice(a, b) {
    if (a.charAt(a.length - 1) === '"' && b.charAt(0) === '"') {
      return a.slice(0, -1) + b.slice(1);
    } else {
      return a + '+' + b;
    }
  }

  function join(exprs, sep) {
    var next,
      len = exprs.length,
      res = exprs[0];
    if (sep) {
      sep = stringify(sep);;
      for (var i = 1; i < len; i++) {
        if (exprs[i] != null) res = splice(splice(res, sep), exprs[i] + '');
      }
    } else {
      for (var i = 1; i < len; i++) {
        if (exprs[i] != null) res = splice(res, exprs[i] + '');
      }
    }
    return res;
  }

  function Compiler(definition) {
    var 
      src,
      handlers = Layout.handlers,
      handlerOrder = Layout.handlerOrder,
      handlerCount = Layout.handlerOrder.length;

    this.compile = function(node, options) {
      var len, i, name, res, sep;
      if (isArray(node)) {
        len = node.length;
        if (options && options.sep) sep = stringify(options.sep);
        res = '';
        for (i = 0; i < len; i++) {
          if (node[i] != null) {
            if (res) {
              if (sep) res = splice(res, sep);
              res = splice(res, this.compile(node[i], options));
            } else {
              res = this.compile(node[i], options);
            }
          }
        }
        return res;
      } else if (isObject(node)) {
        for (i = 0; i < handlerCount; i++) {
          name = handlerOrder[i];
          if (name in node) {
            res = handlers[name].call(this, node, options);
            if (res != null) return res;
          }
        }
        if (node.toString !== _objToString) {
          return stringify(node.toString());
        } else {
          throw new Error('No handler for: ' + stringify(node));
        }
      } else {
        return stringify(node + '');
      }
    }

    this.localVarName = function() {
      var name = '_dolphy$' + this.vars.length;
      this.vars.push(name);
      return name;
    }

    this.validateNode = function(node, allowed) {
      for (var key in node) {
        if (!allowed[key]) {
          throw new Error('"' + key + '" not allowed in ' + stringify(node));
        }
      }
    }

    this.substitute = function(tmpl, map) {
      for (var key in map) {
        if (typeof map[key] !== 'undefined') {
          tmpl = tmpl.replace(new RegExp('#' + key + '#', 'g'), map[key]);
        }
      }
      return tmpl;
    }

    this.toString = function() {
      return src;
    }

    if (isArray(definition) || isObject(definition)) {
      this.hasExpr = false;
      this.vars = [];
      this.utilFunctions = {};
      this.metadata = {};
      src = 'return ' + (this.compile(definition, {sep: '\n'}) || '""');
      if (this.hasExpr) {
        src = 'with (arguments[0] || {}) {\n' + src + '\n}';
      }
      for (var name in this.utilFunctions) {
        src = this.utilFunctions[name] + '\n' + src;
      }
      if (this.vars.length) {
        src = 'var ' + this.vars.join(',') + ';\n' + src;
      }
    } else {
      throw new Error('Layout definition must be an Array or plain Object');
    }
  }

  function Layout(definition) {
    var 
      compiler = new Compiler(definition),
      src = compiler.toString();
    try {
      var func = Function(src);
    } catch (e) {
      console.log(src);
      throw e;
    }
    func.src = src;
    for (var key in compiler.metadata) {
      func[key] = compiler.metadata[key];
    }
    return func;
  }

  Layout.compile = function(definition) {
    return new Compiler(definition) + '';
  }

  Layout.handlers = {};
  Layout.handlerOrder = [];

  function addHandler(name, func) {
    if (!(name in Layout.handlers)) {
      Layout.handlerOrder.push(name);
    }
    Layout.handlers[name] = func;
  }

  Layout.addHandler = function(handler) {
    if (typeof handler === 'function') {
      addHandler(handler.name, handler);
    } else {
      for (var i in handler) {
        addHandler(handler[i].name, handler[i]);
      }
    }
  }

  var selfClosingTags = {
    area:true, base:true, br:true, col:true, command:true, embed:true, 
    hr:true, img:true, input:true, keygen:true, link:true, meta:true, 
    param:true, source:true, track:true, wbr:true
  };

  function $escape(s) {
    return s != null ? ((s + '')
      .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')) : '';
  }

  var compileAttr = function(compiler, name, value) {
    var varName, type = typeof value;
    if (value === true) return stringify(' ' + name);
    if (type === 'string') value = $escape(value);
    if (value !== false && type !== 'undefined') {
      if (value.omitEmpty) {
        compiler.utilFunctions['$escape'] = $escape;
        varName = compiler.localVarName();
        return ('(' + varName + '=(' + 
          compiler.compile(value, {sep: ' ', escape: false}) + '),(' +
          varName + '?(" ' + name + '=\\""' +
          '+$escape(' + varName + ')+"\\""):""))');
      } else {
        return join(['" ' + name + '=\\""', 
          compiler.compile(value, {sep: ' ', escape: true}), 
          '"\\""']);
      }
    }
  }

  var fixExpr = function(compiler, expr, esc) {
    var fixed;
    if (esc) {
      compiler.utilFunctions['$escape'] = $escape;
      fixed = '$escape(' + expr + ')';
    } else {
      fixed = '(' + expr + ')';
    }
    try {
      Function('"use strict";' + fixed);
    } catch (e) {
      throw SyntaxError(e.message + ' for expr: ' + stringify(expr));
    }
    return fixed;
  }

  Layout.addHandler([

    function tag(node) {
      var condition, varName, parts;
      if (node.omitEmpty && node.content) {
        varName = this.localVarName();
        condition = ('(' + varName + '=(' 
          + this.compile(node.content, {sep: '\n'})
          + '),(' + varName + '?(');
      }
      parts = ['"<' + node.tag + '"',
        compileAttr(this, 'id', node.id),
        compileAttr(this, 'class', node.cls),
        compileAttr(this, 'name', node.name),
        compileAttr(this, 'value', node.value)];
      if (node.attr) {
        for (var key in node.attr) {
          parts.push(compileAttr(this, key, node.attr[key]));
        }
      }
      parts.push('">"');
      if (node.content) {
        parts.push('"\\n"');
        if (node.omitEmpty) {
          parts.push(varName);
        } else {
          parts.push(this.compile(node.content, {sep: '\n'}));
        }
        parts.push('"\\n"');
      }
      if (node.content || !(node.tag in selfClosingTags)) {
        parts.push('"</' + node.tag + '>"');
      }
      if (condition) {
        return condition + join(parts) + '):""))';
      } else {
        return join(parts);
      }
    },

    function expr(node, options) {
      this.hasExpr = true;
      return fixExpr(this, node.expr, 
        !(node.escape === false || options.escape === false) || options.escape);
    },

    function test(node, options) {
      this.hasExpr = true;
      if (node.yes || node.no) {
        this.validateNode(node, {test:true, yes:true, no:true});
        return this.substitute('#expr#?(#yes#):(#no#)', {
          expr: fixExpr(this, node.test),
          yes: node.yes ? this.compile(node.yes, options) : '""',
          no: node.no ? this.compile(node.no, options) : '""'
        });
      } else if (node.empty || node.notEmpty) {
        this.validateNode(node, {test:true, empty:true, notEmpty:true});
        return this.substitute(
          '#tmp#=#expr#,#tmp#=Array.isArray(#tmp#)?((#tmp#.length === 0)'
          + '?(#empty#):(#notEmpty#)):("")',
          {
            expr: fixExpr(this, node.test),
            tmp: this.localVarName(),
            empty: node.empty ? this.compile(node.empty, options) : '""',
            notEmpty: node.notEmpty ? this.compile(node.notEmpty, options) : '""'
          }
        );
      } else if (node.plural || node.singular || node.none) {
        this.validateNode(node, {test:true, plural:true, singular:true, none:true});
        var closing = '""';
        var tmpl = '#tmp#=#expr#,#tmp#=Array.isArray(#tmp#)?#tmp#.length:#tmp#,'
        var map = {expr: fixExpr(this, node.test), tmp: this.localVarName()};
        if (node.none) {
          tmpl += '(#tmp#===0)?(#none#):(';
          map.none = this.compile(node.none, options);
          closing += ')';
        }
        if (node.plural) {
          tmpl += '(#tmp#!==1)?(#plural#):(';
          map.plural = this.compile(node.plural, options);
          closing += ')';
        }
        if (node.singular) {
          tmpl += '(#tmp#===1)?(#singular#):(';
          map.singular = this.compile(node.singular, options);
          closing += ')';
        }
        return this.substitute(tmpl + closing, map);
      }
    },

    function each(node, options) {
      var 
        filterExpr = '',
        lastIndexVar, res;
      this.validateNode(node, {each: true, content:true, 
        first:true, last:true, filter: true,
        itemVar:true, indexVar:true});
      this.hasExpr = true;
      res = ('(function(){'
        + 'var #itemVar#,#indexVar#=0,#resVar#="",'
        + '#eachVar#=' + fixExpr(this, node.each) + ','
        + '#lenVar#=#eachVar#.length;');
      if (node.filter) {
        filterExpr = fixExpr(this, node.filter);
        lastIndexVar = this.localVarName();
        res += 'for (;#indexVar#<#lenVar#;#indexVar#++) {'
             + '#itemVar#=#eachVar#[#indexVar#];'
             + 'if (#filterExpr#) {';
        if (node.first) {
          res +=  '#resVar#=(' + this.compile(node.first, options) + '+"\\n");';
        }
        res += 'break;}}';
      } else if (node.first) {
        res += 'if (#lenVar#>0#filterExpr#){'
          + '#itemVar#=#eachVar#[#indexVar#];'
          + '#resVar#=(' + this.compile(node.first, options) + '+"\\n")}';
      }
      if (node.content) {
        res += 'for (;#indexVar#<#lenVar#;#indexVar#++){'
          + '#itemVar#=#eachVar#[#indexVar#];';
        if (filterExpr) {
          res += 'if (#filterExpr#) {' 
              + '#lastIndexVar#=#indexVar#;';
        }
        res += '#resVar#+=(' + this.compile(node.content, options);
        if (node.last) {
          res += '+"\\n");';
        } else {
          res += '+ (#indexVar#<#lenVar#-1?"\\n":""));';
        }
        if (filterExpr) res += '}';
        res += '}';
      }
      if (node.last) {
        res += 'if (#lenVar#>0){';
        if (filterExpr) {
          res += '#indexVar#=#lastIndexVar#;';
        } else {
          res += '--#indexVar#;';
        }
        if (!node.content || filterExpr) {
          res += '#itemVar#=#eachVar#[#indexVar#];'
        }
        res += '#resVar#+=(' + this.compile(node.last, options) + ')}';
      }
      res += 'return #resVar#;})()';
      return this.substitute(res, {
        itemVar: node.itemVar || '$item',
        indexVar: node.indexVar || '$index',
        resVar: this.localVarName(),
        eachVar: this.localVarName(),
        lenVar: this.localVarName(),
        filterExpr: filterExpr,
        lastIndexVar: lastIndexVar,
      });
    },

    function slot(node, options) {
      var 
        tmpl = '',
        slotVar = '_slot$' + node.slot;
      this.validateNode(node, {slot: true, escape: true, required: true});
      if (!this.metadata.slots) this.metadata.slots = [];
      this.metadata.slots.push(node);
      node.options = options;
      if (typeof node.escape !== 'undefined' ? node.escape : options.escape) {
        this.utilFunctions['$escape'] = $escape;
        return '$escape(' + slotVar + ')';
      } else {
        return slotVar;
      }
    },

    function use(node, options) {
      var 
        slotOptions = node.use.slotOptions,
        res = '(function(){',
        slots = node.use.slots || [],
        exists = {},
        name;
      for (var i = 0; i < slots.length; i++) {
        name = slots[i].slot;
        exists[name] = true;
        res += 'var _slot$' + name + '='; 
        if (name in node) {
          res += this.compile(node[name], slots[i].options) + ';';
        } else if (slots[i].required) {
          throw Error('No value supplied for required slot "' + name + '"');
        } else {
          res += '"";';
        }
      }
      for (name in node) {
        if (name !== 'use' && !exists[name]) {
          throw Error('No slot named "' + name + '"');
        }
      }
      res += node.use.src + '})()';
      return res;
    }
  ]);

  return Layout;
});

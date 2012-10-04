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

    this.compile = function(node, sep) {
      var len, i, name, res;
      if (isArray(node)) {
        len = node.length;
        if (sep) sep = stringify(sep);
        res = '';
        for (i = 0; i < len; i++) {
          if (node[i] != null) {
            if (res) {
              if (sep) res = splice(res, sep);
              res = splice(res, this.compile(node[i], sep));
            } else {
              res = this.compile(node[i], sep);
            }
          }
        }
        return res;
      } else if (isObject(node)) {
        for (i = 0; i < handlerCount; i++) {
          name = handlerOrder[i];
          if (name in node) {
            res = handlers[name].call(this, node);
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

    this.toString = function() {
      return src;
    }

    if (isArray(definition) || isObject(definition)) {
      this.hasExpr = false;
      this.vars = [];
      this.utilFunctions = {};
      src = 'return ' + (this.compile(definition, '\n') || '""');
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
    var src = Layout.compile(definition);
    try {
      return new Function(src);
    } catch (e) {
      console.log(src);
      throw e;
    }
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
    return (s + '')
      .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var compileAttr = function(compiler, name, value) {
    var type = typeof value;
    if (value === true) return stringify(' ' + name);
    if (type === 'string') value = $escape(value);
    if (value !== false && type !== 'undefined') {
      return join(['" ' + name + '=\\""', compiler.compile(value, ' '), '"\\""']);
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
      var parts = ['"<' + node.tag + '"',
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
        parts.push(this.compile(node.content, '\n'));
        parts.push('"\\n"');
      }
      if (node.content || !(node.tag in selfClosingTags)) {
        parts.push('"</' + node.tag + '>"');
      }
      return join(parts);
    },
    function expr(node) {
      this.hasExpr = true;
      return fixExpr(this, node.expr, node.escape !== false);
    },
    function test(node) {
      var 
        allowed = {},
        expr = fixExpr(this, node.test),
        varName,
        res;
      this.hasExpr = true;
      if (node.yes || node.no) {
        res = expr + '?(';
        if (node.yes) {
          res += this.compile(node.yes);
        } else {
          res += '""';
        }
        res += '):(';
        if (node.no) {
          res += this.compile(node.no);
        } else {
          res += '""';
        }
        res += ')';
        allowed.test = allowed.yes = allowed.no = true;
      } else if (node.empty || node.notEmpty) {
        varName = this.localVarName();
        res = (varName + '=' + expr + 
          ',Array.isArray(' + varName + ')?((' + varName + '.length === 0)?(');
        if (node.empty) {
          res += this.compile(node.empty);
        } else {
          res += '""';
        }
        res += '):(';
        if (node.notEmpty) {
          res += this.compile(node.notEmpty);
        } else {
          res += '""';
        }
        res += ')):("")';
        allowed.test = allowed.empty = allowed.notEmpty = true;
      } else if (node.plural || node.singular || node.none) {
        var closing = '""';
        varName = this.localVarName();
        res = (varName + '=' + expr + ',' +
          varName + '= Array.isArray(' + varName + ')?' + varName + '.length' +
          ':' + varName + ',');
        if (node.none) {
          res += ('(' + varName + ' === 0)?('
            + this.compile(node.none) + '):(');
          closing += ')';
        }
        if (node.plural) {
          res += ('(' + varName + ' !== 1)?('
            + this.compile(node.plural) + '):(');
          closing += ')';
        }
        if (node.singular) {
          res += ('(' + varName + ' === 1)?('
            + this.compile(node.singular) + '):(');
          closing += ')';
        }
        res += closing;
        allowed.test = allowed.none = allowed.plural = allowed.singular = true;
      }
      for (var key in node) {
        if (!allowed[key]) {
          throw new Error('"' + key + '" not allowed in ' + stringify(node));
        }
      }
      return res;
    }
  ]);

  return Layout;
});

define(function() {
  'use strict';
  var 
    isArray = Array.isArray,
    _objToString = Object.prototype.toString;

  function isObject(obj) {
    return _objToString.call(obj) === '[object Object]';
  };

  function Compiler(definition) {
    var 
      src,
      context = [],
      separator = '\n',
      contextStack = [{context: context, separator: separator}],
      literals = '',
      firstLiteral = true,
      handlers = Layout.handlers,
      handlerOrder = Layout.handlerOrder,
      handlerCount = Layout.handlerOrder.length;

    function closeLiterals() {
      if (literals) {
        context.push('"' + 
          literals.replace(/\\/g, '\\\\')
                  .replace(/\n/g, '\\n')
                  .replace(/"/g, '\\"')
          + '"');
        literals = '';
      }
    }

    this.pushContext = function(separatorChar) {
      context = [];
      if (literals) literals += separator;
      separator = separatorChar || '';
      contextStack.push({context: context, separator: separator});
      firstLiteral = true;
    }

    this.popContext = function() {
      var 
        old = contextStack.pop(),
        top = contextStack[contextStack.length - 1];
      context = top.context;
      separator = top.separator;
      if (old.context.length === 1) {
        closeLiterals();
        this.push(old.context + '');
      } else if (old.context.length > 0) {
        closeLiterals();
        if (old.separator) {
          this.push('[' + old.context.join(',') + '].join("' + old.separator + '")')
        } else {
          this.push(old.context.join(''));
        }
      }
    }

    var pushLiteral = this.pushLiteral = function(s) {
      if (firstLiteral) {
        literals += s;
        firstLiteral = false;
      } else {
        literals += separator + s;
      }
    }

    var push = this.push = function(o) {
      closeLiterals();
      firstLiteral = true;
      context.push(o);
    }

    this.compile = function(node) {
      var len, i, name;
      if (isArray(node)) {
        len = node.length;
        for (i = 0; i < len; i++) { 
          this.compile(node[i]);
        }
      } else if (isObject(node)) {
        len = contextStack.length;
        for (i = 0; i < handlerCount; i++) {
          name = handlerOrder[i];
          if (name in node && handlers[name].call(this, node) !== false) break;
        }
        if (!(name in node)) {
          if (node.toString !== _objToString) {
            pushLiteral(node);
          } else {
            throw new Error('No handler for: ' + JSON.stringify(node));
          }
        } else if (contextStack.length !== len) {
          throw new Error('handler "' + name + '" ' +
            (contextStack.length > len ? 'pushed' : 'popped') +
            ' too many compiler contexts for: ' + JSON.stringify(node));
        }
      } else {
        pushLiteral(node);
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
      this.compile(definition);
      closeLiterals();
      if (contextStack.length !== 1) {
        throw new Error('Invalid compiler context, ' +
          'perhaps a handler is missing a call to popContext()?');
      }
      if (context.length === 1) {
        src = 'return ' + context;
      } else {
        src = 'return [\n' + context.join(',\n') + '].join("\\n");';
      }
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

  var pushAttr = function(compiler, name, value) {
    var type = typeof value;
    if (type === 'string') {
      compiler.pushLiteral(' ' + name + '="' + $escape(value) + '"');
    } else if (value === true) {
      compiler.pushLiteral(' ' + name);
    } else if (value !== false && type !== 'undefined') {
      compiler.pushLiteral(' ' + name + '="');
      compiler.pushContext(' ');
      compiler.compile(value);
      compiler.popContext();
      compiler.pushLiteral('"');
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
      throw SyntaxError(e.message + ' for expr: ' + JSON.stringify(expr));
    }
    return fixed;
  }

  Layout.addHandler([
    function tag(node) {
      this.pushContext();
      this.pushLiteral('<' + node.tag);
      pushAttr(this, 'id', node.id);
      pushAttr(this, 'class', node.cls);
      pushAttr(this, 'name', node.name);
      pushAttr(this, 'value', node.value);
      if (node.attr) {
        for (var key in node.attr) {
          pushAttr(this, key, node.attr[key]);
        }
      }
      this.pushLiteral('>');
      this.popContext();
      if (node.content) {
        this.compile(node.content);
      }
      if (node.content || !(node.tag in selfClosingTags)) {
        this.pushLiteral('</' + node.tag + '>');
      }
    },
    function expr(node) {
      this.hasExpr = true;
      this.push(fixExpr(this, node.expr, node.escape !== false));
    },
    function test(node) {
      var 
        allowed = {},
        expr = fixExpr(this, node.test),
        varName;
      this.hasExpr = true;
      this.pushContext();
      if (node.yes || node.no) {
        this.push(expr + '?(');
        if (node.yes) {
          this.pushContext();
          this.compile(node.yes);
          this.popContext();
        } else {
          this.push('""');
        }
        this.push('):(');
        if (node.no) {
          this.pushContext();
          this.compile(node.no);
          this.popContext();
        } else {
          this.push('""');
        }
        this.push(')');
        allowed.test = allowed.yes = allowed.no = true;
      } else if (node.empty || node.notEmpty) {
        varName = this.localVarName();
        this.push(varName + '=' + expr + 
          ',Array.isArray(' + varName + ')?((' + varName + '.length === 0)?(');
        if (node.empty) {
          this.pushContext();
          this.compile(node.empty);
          this.popContext();
        } else {
          this.push('""');
        }
        this.push('):(');
        if (node.notEmpty) {
          this.pushContext();
          this.compile(node.notEmpty);
          this.popContext();
        } else {
          this.push('""');
        }
        this.push(')):("")');
        allowed.test = allowed.empty = allowed.notEmpty = true;
      } else if (node.plural || node.singular || node.none) {
        varName = this.localVarName();
        this.push(varName + '=' + expr + ',' +
          varName + '= Array.isArray(' + varName + ')?' + varName + '.length' +
          ':' + varName + ',');
        if (node.none) {
          this.push('(' + varName + ' === 0)?(');
          this.pushContext();
          this.compile(node.none);
          this.popContext();
          this.push('):(');
        }
        if (node.plural) {
          this.push('(' + varName + ' !== 1)?(');
          this.pushContext();
          this.compile(node.plural);
          this.popContext();
          this.push('):(');
        }
        if (node.singular) {
          this.push('(' + varName + ' === 1)?(');
          this.pushContext();
          this.compile(node.singular);
          this.popContext();
          this.push('):(');
        }
        this.push('""');
        var clauses = !!node.none + !!node.plural + !!node.singular;
        while (clauses-- > 0) this.push(')');
        allowed.test = allowed.none = allowed.plural = allowed.singular = true;
      }
      for (var key in node) {
        if (!allowed[key]) {
          throw new Error('"' + key + '" not allowed in ' + JSON.stringify(node));
        }
      }
      this.popContext();
    }
  ]);

  return Layout;
});

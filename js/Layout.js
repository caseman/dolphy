define(function() {
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
          this.push(old.context.join('+'));
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

    this.toString = function() {
      return src;
    }

    if (isArray(definition) || isObject(definition)) {
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
      // console.log(src);
    } else {
      throw new Error('Layout definition must be an Array or plain Object');
    }
  }

  function Layout(definition) {
    return new Function(new Compiler(definition));
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
      for (var name in handler) {
        addHandler(name, handler[name]);
      }
    }
  }

  var selfClosingTags = {
    area:true, base:true, br:true, col:true, command:true, embed:true, 
    hr:true, img:true, input:true, keygen:true, link:true, meta:true, 
    param:true, source:true, track:true, wbr:true
  };

  var escape = function(s) {
    return (s + '')
      .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var pushAttr = function(compiler, name, value) {
    var type = typeof value;
    if (type === 'string') {
      compiler.pushLiteral(' ' + name + '="' + escape(value) + '"');
    } else if (type !== 'undefined') {
      compiler.pushLiteral(' ' + name + '="');
      compiler.pushContext(' ');
      compiler.compile(value);
      compiler.popContext();
      compiler.pushLiteral('"');
    }
  }

  Layout.addHandler(function tag(node) {
    this.pushContext();
    this.pushLiteral('<' + node.tag);
    pushAttr(this, 'id', node.id);
    pushAttr(this, 'class', node.cls)
    pushAttr(this, 'name', node.name)
    pushAttr(this, 'value', node.value)
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
  });

  return Layout;
});

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
      compiled = [],
      literals = '',
      handlers = Layout.handlers,
      handlerOrder = Layout.handlerOrder,
      handlerCount = Layout.handlerOrder.length;

    function closeLiterals() {
      if (literals) {
        compiled.push('"' + 
          literals.replace(/\\/g, '\\\\')
                  .replace(/\n/g, '\\n')
                  .replace(/"/g, '\\"')
          + '"');
        literals = '';
      }
    }

    var pushLiteral = this.pushLiteral = function(s) {
      if (literals) {
        literals += '\n' + s;
      } else {
        literals = s + '';
      }
    }

    var push = this.push = function(o) {
      closeLiterals();
      compiled.push(o);
    }

    var compile = this.compile = function(node) {
      var len, i, name, handlers;
      if (isArray(node)) {
        len = node.length;
        for (i = 0; i < len; i++) { 
          compile(node[i]);
        }
      } else if (isObject(node)) {
        for (i = 0; i < handlerCount; i++) {
          name = handlerOrder[i];
          if (name in node) {
            handlers[name](node, this);
            break;
          }
        }
        if (!(name in node) && node.toString !== _objToString) {
          pushLiteral(node);
        }
      } else {
        pushLiteral(node);
      }
    }

    if (isArray(definition) || isObject(definition)) {
      compile(definition);
      closeLiterals();
      if (compiled.length === 1) {
        src = 'return ' + compiled;
      } else {
        src = 'return [\n' + compiled.join(',\n') + '].join("\\n")';
      }
      // console.log(src);
      return new Function(src);
    } else {
      throw new Error('Layout definition must be an Array or plain Object');
    }
  }

  function Layout(definition) {
    return new Compiler(definition);
  }

  Layout.handlers = {};
  Layout.handlerOrder = [];
  Layout.addHandler = function(handlerFunc) {
    if (!handlerFunc.name in Layout.handlers) {
      Layout.handlerOrder.push(handlerFunc.name);
    }
    Layout.handlers[handlerFunc.name] = handlerFunc;
  }

  Layout.addHandler(function tag(node, compiler) {
    
  });

  return Layout;
});

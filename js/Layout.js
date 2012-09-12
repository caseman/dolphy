define(function() {
  var 
    isArray = Array.isArray,
    _objToString = Object.prototype.toString,
    handler = {};

  function isObject(obj) {
    return _objToString.call(obj) === '[object Object]';
  };

  return function Layout(definition) {
    var 
      src,
      compiled = [],
      literals = '';

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

    function pushLiteral(s) {
      if (literals) {
        literals += '\n' + s;
      } else {
        literals = s + '';
      }
    }

    function push(o) {
      closeLiterals();
      compiled.push(o);
    }

    function compileNode(def) {
      var compiled, reduced, working, len;
      if (isArray(def)) {
        len = def.length;
        for (var i = 0; i < len; i++) { 
          compileNode(def[i]);
        }
      } else if (isObject(def)) {
        if (def.toString !== _objToString) {
          pushLiteral(def);
        }
      } else {
        pushLiteral(def);
      }
    }

    if (isArray(definition) || isObject(definition)) {
      compileNode(definition);
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
});

var createVNode = require('virtual-dom/h');
var createVSVGNode = require('virtual-dom/virtual-hyperscript/svg');
var htmltree = require("htmltree");
var camel = require('to-camel-case');

module.exports = virtualHTML;

function SrcHook (value) {
  this.value = value;
};
SrcHook.prototype.hook = function (node, prop, prev) {
  if(!prev) {
    node[prop] = this.value;
  }
  if(prev && prev.value !== this.value) {
    node[prop] = 'about:blank';
    setTimeout(() => {
      node[prop] = this.value;
    }, 16);
  }
};

function virtualHTML (html, callback) {
  callback = callback || defaultCb;
  if (typeof html == 'function') html = html();
  var res = null;

  htmltree(html, function (err, dom) {
    if (err) return callback(err);
    res = vnode(dom.root[0]);
    callback(undefined, res);
  });

  return res;

  function defaultCb (err) {
    if (err) throw new Error(err);
  }
}

function vnode (parent) {
  if (parent.type == "text") return parent.data;
  if (parent.type != "tag") return;

  var create = createVNode;
  var children;
  var child;
  var len;
  var i;

  if (parent.children.length) {
    children = [];
    len = parent.children.length;
    i = -1;

    while (++i < len) {
      child = vnode(parent.children[i]);
      if (!child) continue;
      children.push(child);
    }
  }

  var attributes = parent.attributes;
  if (attributes.style) attributes.style = style(attributes.style);
  if (attributes['class']) attributes.className = attributes['class'];
  if (attributes['for']) {
    attributes.htmlFor = attributes['for'];
    delete attributes['for'];
  }
  if(attributes.viewbox) attributes.viewBox = attributes.viewbox;
  if(attributes.preserveaspectratio) attributes.preserveAspectRatio = attributes.preserveaspectratio;

  attributes.dataset = createDataSet(attributes);
  attributes.attributes = createDatasetAttributes(attributes);

  // TODO: Check if svg-element. This is just a fulhack
  if(parent.name === 'svg' || parent.name === 'polygon') {
    create = createVSVGNode;
  }

  if(parent.name === 'img') {
    attributes.src = new SrcHook(attributes.src);
  }

  if(parent.name === 'source') {
    attributes.srcset = new SrcHook(attributes.srcset);
  }

  return create(parent.name, attributes, children);
}

function style (raw) {
  if (!raw) return {};

  var result = {};
  var fields = raw.split(/;\s?/);
  var len = fields.length;
  var i = -1;
  var s;

  while (++i < len) {
    s = fields[i].indexOf(':');
    result[fields[i].slice(0, s)] = fields[i].slice(s + 1).trim();
  }

  return result;
}

function createDataSet (props) {
  var dataset;
  var key;

  for (key in props) {
    if (key.slice(0, 5) == 'data-') {
      dataset || (dataset = {});
      dataset[camel(key.slice(5))] = props[key];
    }
  }

  return dataset;
}

function createDatasetAttributes (properties) {
  var attributes = properties.attributes || {};
  var key;

  for (key in properties) {
    if (key.slice(0, 5) == 'data-') {
      attributes[key] = properties[key];
    }
  }

  return attributes;
}

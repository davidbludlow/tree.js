// Copyright Erik Weitnauer 2012, 2013.

var Tree = function(node) {
  this.children = [];
  if (node) Tree.append(this, node);
}

/// This line is for the automated tests with node.js
if (typeof(exports) != 'undefined') { exports.Tree = Tree }

Tree.parse = function(str) {
  var t = new Tree();
  var curr = t;
  for (var i=0; i<str.length; i++) {
    var c = str[i];
    if (c == '[') {
      var n = {children: [], parent: curr, value: ''};
      curr.children.push(n);
      curr = n;
    } else if (c == ']') {
      curr = curr.parent;
      if (curr === t) break;
    } else if (c == ',') {
      n = {children:[], parent: curr.parent, value: ''};
      curr.parent.children.push(n);
      n.ls = curr;
      curr.rs = n;
      curr = n;
    } else {
      curr.value += c;
    }
  }
  return t;
}

Tree.prototype.stringify = function(node) {
  var res = '';
  if (!node && this.children.length === 0) return '[]';
  if (node) res = node.value;
  node = node || this;
  var curr = node;
  for (;;) {
    if (curr.children && curr.children[0]) {
      curr = curr.children[0];
      res += '[' + curr.value;
      continue;
    }
    while (!curr.rs) {
      res += ']';
      curr = curr.parent;
      if (curr === node) return res;
    }
    curr = curr.rs;
    res += ','+curr.value;
  }
}

/// Adds a uid() function to Tree, that returns a random hex number with 16 digets as string.
;(function() {
  var b32 = 0x100000000, f = 0xf, b = []
      str = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
  function uid() {
    var i = 0;
    var r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    r = Math.random()*b32;
    b[i++] = str[r & f];
    b[i++] = str[r>>>4 & f];
    b[i++] = str[r>>>8 & f];
    b[i++] = str[r>>>12 & f];
    b[i++] = str[r>>>16 & f];
    b[i++] = str[r>>>20 & f];
    b[i++] = str[r>>>24 & f];
    b[i++] = str[r>>>28 & f];
    return b.join("");
  };
  Tree.uid = uid;
})();

/// Will clone a node and its children. Attributes beside 'children', 'ls', 'rs' and 'parent' will
/// just be a shallow copy of the original nodes. Attributes starting with '_' will not be copied at
/// all. 'ls', 'rs' and 'parent' will be set to the correct values for all children and will be set to
/// undefined for the passed node. A new random id is assigned to the cloned node if the original had
/// an id, unless the optional keep_ids parameter is passed as true.
Tree.clone = function(node, keep_ids) {
  var cloned = new node.constructor();
  for (var key in node) { if (key[0] !== '_') cloned[key] = node[key] }
  delete cloned.ls; delete cloned.rs; delete cloned.parent;
  if (node.id && !keep_ids) cloned.id = Tree.uid();
  if (node.children) {
    cloned.children = [];
    for (var i=0; i<node.children.length; i++) {
      cloned.children.push(Tree.clone(node.children[i], keep_ids));
      cloned.children[i].parent = cloned;
    }
    for (var i=0; i<node.children.length; i++) {
      cloned.children[i].ls = cloned.children[i-1];
      cloned.children[i].rs = cloned.children[i+1];
    }
  }
  return cloned;
}
Tree.prototype.clone = Tree.clone;

/// Inserts a node into the tree as the child at position 'idx' of 'parent'. Returns the inserted
/// node.
Tree.insert = function(parent, idx, node) {
  node.ls = parent.children[idx-1];
  if (parent.children[idx-1]) parent.children[idx-1].rs = node;
  node.rs = parent.children[idx];
  if (parent.children[idx]) parent.children[idx].ls = node;
  node.parent = parent;
  parent.children.splice(idx, 0, node);
  return node;
}
Tree.prototype.insert = Tree.insert;

/// Inserts a node into the tree as the last child of 'parent'. Returns the inserted node.
Tree.append = function(parent, node) {
  return Tree.insert(parent, parent.children.length, node);
}
Tree.prototype.append = Tree.append;

/// Inserts a node into the tree as the first child of 'parent'. Returns the inserted node.
Tree.prepend = function(parent, node) {
  return Tree.insert(parent, 0, node);
}
Tree.prototype.prepend = Tree.prepend;

/// Removes the passed node from the tree and returns its previous index.
Tree.remove = function(node) {
  var idx;
  var siblings = node.parent.children;
  idx = siblings.indexOf(node);
  if (idx >= 0) {
    if (siblings[idx-1]) siblings[idx-1].rs = node.rs;
    if (siblings[idx+1]) siblings[idx+1].ls = node.ls;
    siblings.splice(idx,1);
  }
  return idx;
}
Tree.prototype.remove = Tree.remove;

/// Replaces n1 with n2 by removing n1 and inserting n2 at n1's old position. If n2 was part of a
/// tree (had a parent), it will be removed before being inserted at the new position.
/// Returns the inserted node.
Tree.replace = function(n1, n2) {
  if (n2.parent) Tree.remove(n2);
  var idx = Tree.remove(n1);
  return Tree.insert(n1.parent, idx, n2);
}
Tree.prototype.replace = Tree.replace;

/// Will switch n1 with n2 if they have the same parent. Otherwise throws an exception.
Tree.switch_siblings = function(n1, n2) {
  if (n1.parent != n2.parent) throw "Called switch_siblings on nodes that are no siblings!";
  var p = n1.parent;
  var idx1 = p.children.indexOf(n1);
  var idx2 = p.children.indexOf(n2);
  p.children[idx1] = n2;
  p.children[idx2] = n1;
  var h;
  if (n1.rs == n2) {
    if (n1.ls) n1.ls.rs = n2;
    if (n2.rs) n2.rs.ls = n1;
    n1.rs = n2.rs;
    n2.ls = n1.ls;
    n1.ls = n2;
    n2.rs = n1;
  } else if (n1.ls == n2) {
    if (n1.rs) n1.rs.ls = n2;
    if (n2.ls) n2.ls.rs = n1;
    n1.ls = n2.ls;
    n2.rs = n1.rs;
    n1.rs = n2;
    n2.ls = n1;
  } else {
    if (n1.ls) n1.ls.rs = n2;
    if (n1.rs) n1.rs.ls = n2;
    if (n2.ls) n2.ls.rs = n1;
    if (n2.rs) n2.rs.ls = n1;
    h = n1.ls; n1.ls = n2.ls; n2.ls = h;
    h = n1.rs; n1.rs = n2.rs; n2.rs = h;
  }
}
Tree.prototype.switchSiblings = Tree.switchSiblings;


/// Will throw an expecption if any node in the tree has invalid value for parent, ls or rs.
Tree.validate = function(tree) {
  var check = function(node, parent) {
    if (node.parent != parent) throw "wrong parent information";
    if (node.children) {
      for (var i=0; i<node.children.length; i++) {
        var child = node.children[i];
        if (child.ls != node.children[i-1]) throw "wrong ls information";
        if (child.rs != node.children[i+1]) throw "wrong rs information";
        check(child, node);
      }
    }
  }
  check(tree, null);
}
Tree.prototype.validate = function() { Tree.validate(this); }

/// Pass the parent node and then a sequence of children indices to get a specific
/// child. E.g. for `[A[B,C[D]]]`, Tree.get(t, [0, 1, 0]) will return node `D`.
Tree.get_child = function(node, path) {
  for (var i=0; i<path.length; i++) node = node.children[path[i]];
  return node;
}
Tree.prototype.get_child = function(path) {
  return Tree.get_child(this, path);
}

/// Pass a node to get an array of children-indices from the root to the
/// passed node. This is the inverse function to Tree.get_child.
Tree.get_path = function(node) {
  var path = [];
  while (node.parent) {
    path.unshift(node.parent.children.indexOf(node));
    node = node.parent;
  }
  return path;
}
Tree.prototype.get_path = Tree.get_path;

/// Calls the passed function for all nodes and each of their descendents. If children_first is
/// passed as true, the algorithm works bottom-up, else top-down. Both children_first and node are
/// optional and default to 'false' and 'this'. If node is passed, it can either be a single node
/// or an array of nodes.
Tree.forEach = function(f, children_first, node) {
  var nodes = node ? (Array.isArray(node) ? node : [node]) : this.children;
  var traverse = function(node) {
    if (!children_first) f(node);
    if (node.children) for (var i=0; i<node.children.length; i++) traverse(node.children[i]);
    if (children_first) f(node);
  }
  for (var i=0; i<nodes.length; i++) traverse(nodes[i]);
}
Tree.prototype.forEach = Tree.forEach;

/// Returns an array of all nodes for which the passed selector function returned true. Traverses
/// the nodes in a top-down left-right order. Optionally, an nodes can be passed in which
/// case it is searched.
Tree.select_all = function(selector, node) {
  var result = [];
  var nodes = node ? [node] : this.children;
  var f = function(node) {
    if (selector(node)) result.push(node);
    if (node.children) for (var i=0; i<node.children.length; i++) f(node.children[i]);
  }
  for (var i=0; i<nodes.length; i++) f(nodes[i]);
  return result;
}
Tree.prototype.select_all = Tree.select_all;

/// Returns the first node in the passed tree for that the selector function returns true.
Tree.select_first = function(selector, node) {
  node = node || this;
  var curr = node;
  for (;;) {
    if (selector(curr)) return curr;
    if (curr.children && curr.children[0]) {
      curr = curr.children[0];
      continue;
    }
    while (!curr.rs) {
      curr = curr.parent;
      if (curr === node) return null;
    }
    curr = curr.rs;
  }
}
/// Here, node is optional and if not passed the tree itself is used as root node.
Tree.prototype.select_first = Tree.select_first;

/// Returns an array of all leaf nodes (which might be used for visualization directly).
/// Optionally, a node can be passed in which case its leaf nodes are extracted.
Tree.prototype.get_leaf_nodes = function(node) {
  return this.select_all(function(n) { return !(n.children && n.children.length) }, node);
}

/// Calls to_string for all nodes in the passed array and returns the concatinated string.
Tree.to_string = function(nodes) {
  return nodes.map(function(n) { return n.to_string() }).join("");
}

/// Calls to_string for all nodes in the passed array and returns the concatinated string. If no
/// nodes are passed, the toplevel nodes of the tree are used instead.
Tree.prototype.to_string = function(nodes) {
  nodes = nodes || this.children;
  return Tree.to_string(nodes);
}

/// Returns the first leaf child of a node.
Tree.prototype.first_leaf = function(n) {
  if (!n.children) return n;
  return this.first_leaf(n.children[0]);
}

/// Retruns true if the node is top-level in the tree (its parent is the Tree object).
Tree.is_root = function(node) {
  return node && node.parent instanceof Tree;
}

/// Returns an array of nodes in the tree that have the passed value and don't have the 'hidden'
/// property set to true. Optionally, an array of nodes can be passed in which case they are
/// searched instead.
Tree.prototype.get_by_value = function(value, nodes) {
  return this.select_all(function(node) {
    return (!node.hidden && node.to_string() === value)
  }, nodes);
}

// Returns the node with the passed id. If no node has the id, returns null.
Tree.get_by_id = function(id, root) {
  return Tree.select_first(function (n) { return n.id === id }, root);
}
Tree.prototype.get_by_id = function(id, root) {
  return this.select_first(function (n) { return n.id === id }, root || this);
}

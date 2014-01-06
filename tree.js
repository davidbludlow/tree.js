// Copyright Erik Weitnauer 2012, 2013.

/** This is an implementation of fully linked nary-trees. Each non-leaf node has an array
of its children `children`, a reference to its left sibling `ls`, a reference to its right
sibling `rs` and a reference to its parent `parent`.
The Tree object is a collection of methods to handle tree structures, its not instanciated
itself. Instead, each object can be a tree node.

Most of the methods can accept both a single node or an array of nodes to work on.
*/

var Tree = { version: '0.1.0' };

/// This line is for the automated tests with node.js
if (typeof(exports) != 'undefined') { exports.Tree = Tree }

/// Will parse a sting like '[A,B[b1,b2,b3],C]' and return the top-level node of a
/// tree structure. If there are more than a single top-level node, an array of them
/// is returned (e.g. 'A,B'). Use square brackets to denote children of a node and commas
/// to separate nodes from each other. You can use any names for the nodes except ones
/// containing ',', '[' or ']'. The names will be saved in each node's `value` field.
/// Nodes will also be created in absense of values, e.g. '[,]' will return an object
/// with empty value that has an array `children` with two nodes with empty values.
Tree.parse = function(str) {
  var top = {children:[]};
  top.children.push({parent: top, value: '', children:[]});
  var curr = top.children[0];
  for (var i=0; i<str.length; i++) {
    var c = str[i];
    if (c == '[') {
      var n = {children: [], parent: curr, value: ''};
      curr.children.push(n);
      curr = n;
    } else if (c == ']') {
      curr = curr.parent;
      if (curr === top) throw 'parse error';
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
  for (var i=0; i<top.children.length; i++) delete top.children[i].parent;
  if (top.children.length === 1) return top.children[0];
  return top.children;
}

/// Inverse of Tree.parse, returns a string representation of the nodes, using their
/// `value` fields. This is just for debugging and allows you to look at the structure
/// of a tree and the `value` fields of its nodes. `nodes` can be a single node or an
/// array of nodes.
Tree.stringify = function(nodes) {
  var f = function(node) {
    var str = '';
    if ('value' in node) str += node.value;
    if (node.children && node.children[0]) {
      str += '[' + node.children.map(f).join(',') + ']';
    }
    return str;
  }
  if (!Array.isArray(nodes)) nodes = [nodes];
  return nodes.map(f).join(',');
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
/// `nodes` can either be a single node or an array of nodes. Accordingly, a single node or an array
/// of nodes is returned.
Tree.clone = function(nodes, keep_ids) {
  var f = function(node) {
    var cloned = new node.constructor();
    for (var key in node) { if (key[0] !== '_') cloned[key] = node[key] }
    delete cloned.ls; delete cloned.rs; delete cloned.parent;
    if (node.id && !keep_ids) cloned.id = Tree.uid();
    if (node.children) {
      cloned.children = [];
      for (var i=0; i<node.children.length; i++) {
        cloned.children.push(f(node.children[i]));
        cloned.children[i].parent = cloned;
      }
      for (var i=0; i<node.children.length; i++) {
        cloned.children[i].ls = cloned.children[i-1];
        cloned.children[i].rs = cloned.children[i+1];
      }
    }
    return cloned;
  }
  if (!Array.isArray(nodes)) return f(nodes);
  var cloned = [];
  for (var i=0; i<nodes.length; i++) cloned.push(f(nodes[i]));
  return cloned;
}

/// Returns the smallest range of nodes (continuous, ordered neighbors) covering the passed
/// nodes. The method first gets the closest common ancestor and then selects a range of its
/// children that contains all the passed nodes.
Tree.nodes_to_range = function(nodes) {
  var N = nodes.length;
  if (N === 0) return [];
  if (N === 1) return [nodes[0]];
  var tree = nodes[0];
  while (tree.parent) tree = tree.parent;

  // get the closest common anchestor (cca)
  var paths = nodes.map(function(node) {
    return Tree.get_path(node);
  });
  var same = function(len) {
    if (paths[0].length<=len) return false;
    var val = paths[0][len];
    for (var i=1; i<paths.length; i++) {
      if (paths[i].length-1 <= len+1) return false; // we want an ancestor, so if already at leaf, return
      if (paths[i][len] !== val) return false;
    }
    return true;
  }
  var cpl = 0; // common path length
  while (same(cpl)) cpl++;
  var cca = Tree.get_child(paths[0].slice(0, cpl), tree);

  // get the cca's left-most and right-most child that contains one of the nodes
  var rm=-1, lm=N;
  for (var i=0; i<N; i++) {
    var n = Tree.get_child(paths[i].slice(0, cpl+1), tree);
    var idx = cca.children.indexOf(n);
    if (idx > rm) rm = idx;
    if (idx < lm) lm = idx;
  }

  // now select the whole range of nodes from left to right
  var range = [];
  for (var i=lm; i<=rm; i++) range.push(cca.children[i]);
  return range;
}

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

/// Inserts a range of nodes at the position `idx` into the children array
/// of the node `parent`. The `nodes` array must contain a list of direct
/// siblings ordered from left to right.
Tree.insert_range = function(parent, idx, nodes) {
  var N=nodes.length;
  if (N===0) return;
  nodes[0].ls = parent.children[idx-1];
  if (parent.children[idx-1]) parent.children[idx-1].rs = nodes[0];
  nodes[N-1].rs = parent.children[idx];
  if (parent.children[idx]) parent.children[idx].ls = nodes[N-1];
  for (var i=0; i<N; i++) nodes[i].parent = parent;
  parent.children = parent.children.slice(0,idx).concat(nodes, parent.children.slice(idx));
  return nodes;
}

/// Inserts a node into the tree as the last child of 'parent'. Returns the inserted node.
Tree.append = function(parent, node) {
  var last = parent.children[parent.children.length-1];
  if (last) last.rs = node;
  node.ls = last;
  node.rs = null;
  node.parent = parent;
  parent.children.push(node);
  return node;
}

/// Removes the passed node from the tree and returns its previous index.
Tree.remove = function(node) {
  var idx;
  var siblings = node.parent.children;
  idx = siblings.indexOf(node);
  if (siblings[idx-1]) siblings[idx-1].rs = node.rs;
  if (siblings[idx+1]) siblings[idx+1].ls = node.ls;
  siblings.splice(idx,1);
  return idx;
}

/// Removes a range of nodes from the tree and returns the index of the first node if
/// nodes contained more than zero nodes. The `nodes` array must contain a list of direct
/// siblings ordered from left to right.
Tree.remove_range = function(nodes) {
  var N = nodes.length;
  if (N === 0) return;
  var siblings = nodes[0].parent.children;
  idx = siblings.indexOf(nodes[0]);
  if (siblings[idx-1]) siblings[idx-1].rs = nodes[N-1].rs;
  if (siblings[idx+N]) siblings[idx+N].ls = nodes[0].ls;
  siblings.splice(idx,N);
  return idx;
}

/// Replaces n1 with n2 by removing n1 and inserting n2 at n1's old position. If n2 was part of a
/// tree (had a parent), it will be removed before being inserted at the new position. It is safe
/// to replace a node with its child.
/// Returns the inserted node.
Tree.replace = function(n1, n2) {
  if (n2.parent) Tree.remove(n2);
  var idx = Tree.remove(n1);
  return Tree.insert(n1.parent, idx, n2);
}

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

/// Will throw an expecption if any node in the tree has invalid value for parent, ls or rs.
/// `nodes` can either be a single node or an array of nodes. Accordingly, a single node or an array
/// of nodes is returned.
Tree.validate = function(nodes) {
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
  if (!Array.isArray(nodes)) nodes = [nodes];
  for (var i=0; i<nodes.length; i++) check(nodes[i], null);
}

/// Pass the parent node and then a sequence of children indices to get a specific
/// child. E.g. for `[A[B,C[D]]]`, Tree.get(t, [0, 1, 0]) will return node `D`.
/// If the path does not exist, the method throws an 'invalid path' exception.
Tree.get_child = function(path, node) {
  for (var i=0; i<path.length; i++) {
    if (!node.children || node.children.length <= path[i]) throw 'invalid path';
    node = node.children[path[i]];
  }
  return node;
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

/// Calls the passed function for the passed node and all its descandents in depth-first order.
/// Node can either be a single node or an array of nodes.
Tree.for_each = function(f, node) {
  var nodes = Array.isArray(node) ? node : [node];
  var traverse = function(node) {
    f(node);
    if (node.children) for (var i=0; i<node.children.length; i++) traverse(node.children[i]);
  }
  for (var i=0; i<nodes.length; i++) traverse(nodes[i]);
}

/// Calls the passed function for each of the passed nodes and their anchestors, depth-first.
/// The results are stored in an array that is returned. Node can either be a single node or
/// an array of nodes.
Tree.map = function(f, node) {
  var nodes = Array.isArray(node) ? node : [node];
  var res = [];
  var traverse = function(node) {
    res.push(f(node));
    if (node.children) for (var i=0; i<node.children.length; i++) traverse(node.children[i]);
  }
  for (var i=0; i<nodes.length; i++) traverse(nodes[i]);
  return res;
}

/// Returns an array of all nodes for which the passed selector function returned true. Traverses
/// the nodes depth-first. The passed node can either be a single node or an array of nodes.
Tree.select_all = function(selector, node) {
  var result = [];
  var nodes = Array.isArray(node) ? node : [node];
  var f = function(node) {
    if (selector(node)) result.push(node);
    if (node.children) for (var i=0; i<node.children.length; i++) f(node.children[i]);
  }
  for (var i=0; i<nodes.length; i++) f(nodes[i]);
  return result;
}

/// Returns the first node in the passed node or its decandents for that the selector function
/// returns true. Traverses depth-first. Node can either be a single node or an array of nodes.
/// If no nodes matches, returns null.
Tree.select_first = function(selector, node) {
  var f = function(node) {
    var curr = node;
    for (;;) {
      if (selector(curr)) return curr;
      if (curr.children && curr.children[0]) {
        curr = curr.children[0];
        continue;
      }
      if (curr === node) return null;
      while (!curr.rs) {
        curr = curr.parent;
        if (curr === node) return null;
      }
      curr = curr.rs;
    }
  }
  var nodes = Array.isArray(node) ? node : [node];
  for (var i=0; i<nodes.length; i++) {
    var n = f(nodes[i]);
    if (n) return n;
  }
  return null;
}

/// Returns an array of all leaf nodes of the node array or single node passed.
Tree.get_leaf_nodes = function(node) {
  return Tree.select_all(function(n) { return !(n.children && n.children.length) }, node);
}

/// Retruns true if the node is top-level in the tree (its parent is the Tree object).
Tree.is_root = function(node) {
  return !node.parent;
}

/// Returns the tree that a node belongs to by following the .parent references. Returns
/// null if the top-most parent is not a Tree.
Tree.get_root = function(node) {
  while (node.parent) node = node.parent;
  return node;
}

/// Returns an array of all nodes that have the passed value in their .value field. Seaches on
/// the passed array of nodes or single node depth-first.
Tree.get_by_value = function(value, node) {
  return Tree.select_all(function(n) { return n.value === value}, node);
}

/// Returns the first node with the passed id or null if no node has the id. Seaches on
/// the passed array of nodes or single node depth-first.
Tree.get_by_id = function(id, node) {
  return Tree.select_first(function (n) { return n.id === id }, node);
}

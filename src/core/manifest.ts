import type { CozyCanvas, CozyRange, CozyTOC, CozyTOCNode } from '../types';

export const getTableOfContents = (ranges: CozyRange[]) => (): CozyTOC => {
  const index = new Map<string, CozyTOCNode>();

  const buildTree = (range: CozyRange, parent: CozyTOCNode | undefined, level: number = 0): CozyTOCNode => {
    const node: CozyTOCNode = {
      id: range.id,
      type: 'range',
      source: range,
      children: [],
      navItems: [],
      navSections: [],
      parent,
      level,
      getLabel: range.getLabel,
    };
    
    if (range.items && range.items.length > 0) {
      range.items.forEach(item => {
        if (item.source.type === 'Range') {
          const r = item as CozyRange;
          const childNode = buildTree(r, node, level + 1);
          node.children.push(childNode);
        } else {
          // This child is Canvas, i.e. a TOCNode with
          // no further children.
          const canvasChild: CozyTOCNode = {
            id: item.id,
            type: 'canvas',
            source: item as CozyCanvas,
            children: [],
            navItems: [],
            navSections: [],
            parent: node,
            level: level + 1,
            getLabel: item.getLabel
          };

          // Add leaf node to children & lookup index
          node.children.push(canvasChild);
          index.set(canvasChild.id, canvasChild);
        }
      });
    }

    // From the actual child ToC Nodes, infer the "logical" child navItems
    // (canvases) and navSections (ranges).
    const navChildren = node.children.map(n => {
      if (n.type === 'canvas') {
        // An actual leaf node
        return n.source as CozyCanvas;
      } else if (n.children.length === 1 && n.children[0].type === 'canvas') {
        // A range with a single canvas child - logical leaf node!
        return n.children[0].source as CozyCanvas;
      } else {
        return n.source as CozyRange;
      }
    });

    const navItems = navChildren.filter(c => c.source.type === 'Canvas') as CozyCanvas[];
    const navSections = navChildren.filter(c => c.source.type === 'Range') as CozyRange[];
    
    node.navItems.push(...navItems);
    node.navSections.push(...navSections);

    index.set(node.id, node);

    return node;
  };

  const topRanges = ranges.filter(range => range.source.behavior?.includes('top'));
  const root = topRanges.map(range => buildTree(range, undefined));

  const getNode = (id: string) => index.get(id);

  const getBreadcrumbs = (id: string) => {
    const thisNode = index.get(id);
    if (!thisNode) return [];

    const addParent = (node: CozyTOCNode, breadcrumbs: CozyTOCNode[] = []) => {
      if (node.parent) {
        return addParent(node.parent, [node, ...breadcrumbs]);
      } else {
        return [node, ...breadcrumbs];
      }
    }

    return addParent(thisNode);
  }

  const enumerateNodes = (type?: 'range' | 'canvas'): CozyTOCNode[] => {
    const all = Array.from(index.values());
    return type ? all.filter(n => n.type === type) : all;
  }

  return { root, enumerateNodes, getBreadcrumbs, getNode };
}
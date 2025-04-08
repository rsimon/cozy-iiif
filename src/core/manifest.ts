import type { CozyRange, CozyTOCNode } from '../types';

export const getTableOfContents = (ranges: CozyRange[]) => () => {

  const buildTree = (range: CozyRange, parent: CozyTOCNode | undefined, level: number = 0): CozyTOCNode => {
    const node: CozyTOCNode = {
      id: range.id,
      type: 'range',
      getLabel: range.getLabel,
      children: [],
      canvases: [],
      ranges: [],
      parent,
      level
    };
    
    if (range.items && range.items.length > 0) {
      range.items.forEach(item => {
        if (item.source.type === 'Range') {
          const r = item as CozyRange;
          const childNode = buildTree(r, node, level + 1);
          
          node.children.push(childNode);

          // TODO flatten item's ranges and canvases!

        } else {
          node.children.push({
            id: item.id,
            type: 'canvas',
            getLabel: item.getLabel,
            children: [],
            canvases: [],
            ranges: [],
            parent: node,
            level: level + 1
          });
        }
      });
    }
    
    return node;
  };

  const topRanges = ranges.filter(range => range.source.behavior?.includes('top'));
  return topRanges.map(range => buildTree(range, undefined));
}
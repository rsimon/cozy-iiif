import type { CozyRange, CozyTOCNode } from '../types';

export const getTableOfContents = (ranges: CozyRange[]) => () => {

  const buildTree = (range: CozyRange, parent: CozyTOCNode | undefined, level: number = 0): CozyTOCNode => {
    const node: CozyTOCNode = {
      id: range.id,
      type: 'range',
      getLabel: range.getLabel,
      children: [],
      parent,
      level
    };
    
    if (range.items && range.items.length > 0) {
      range.items.forEach(item => {
        if (item.source.type === 'Range') {
          const childNode = buildTree(item as CozyRange, node, level + 1);
          node.children.push(childNode);
        } else {
          node.children.push({
            id: item.id,
            type: 'canvas',
            getLabel: item.getLabel,
            children: [],
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
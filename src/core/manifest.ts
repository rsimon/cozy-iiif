import type { Canvas, Manifest, Range } from '@iiif/presentation-3';
import { Traverse } from '@iiif/parser';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import { parseCanvas } from './canvas';
import { getLabel, getMetadata } from './resource';
import type { 
  CozyCanvas, 
  CozyManifest, 
  CozyRange, 
  CozyTOC, 
  CozyTOCNode 
} from '../types';

/**
 * Parse raw JSON presentation API Manifest into a CozyManifest.
 */
export const parseManifestResource = (resource: any, majorVersion: number): CozyManifest => {

  const parseV3 = (manifest: Manifest) => {
    const sourceCanvases: Canvas[] = [];
    const sourceRanges: Range[] = [];

    const modelBuilder = new Traverse({
      canvas: [canvas => { if (canvas.items) sourceCanvases.push(canvas) }],
      range: [range => { if (range.type === 'Range') sourceRanges.push(range) }]
    });
  
    modelBuilder.traverseManifest(manifest);
    
    const canvases = sourceCanvases.map(parseCanvas);

    const toRange = (source: Range): CozyRange => {
      const items = source.items || [];

      const nestedCanvases: CozyCanvas[] = items
        .filter((item: any) => item.type === 'Canvas')
        .map((item: any) => canvases.find(c => c.id === item.id)!)
        .filter(Boolean);

      const nestedRanges = items
        .filter((item: any) => item.type === 'Range')
        .map((item: any) => toRange(item));

      const nestedItems = [...nestedCanvases, ...nestedRanges];
        
      return {
        source,
        id: source.id,
        // Maintain original order
        items: items.map((i: any) => nestedItems.find(cozy => cozy.id === i.id)),
        canvases: nestedCanvases,
        ranges: nestedRanges,
        getLabel: getLabel(source)
      } as CozyRange;
    }

    const ranges = sourceRanges.map((source: Range) => toRange(source));
    return { canvases, ranges };
  }

  const v3: Manifest = majorVersion === 2 ? convertPresentation2(resource) : resource;

  const { canvases, ranges } = parseV3(v3);

  return {
    source: v3,
    id: v3.id,
    majorVersion,
    canvases,
    structure: ranges,
    getLabel: getLabel(v3),
    getMetadata: getMetadata(v3),
    getTableOfContents: getTableOfContents(ranges)
  }
}

// Range with a single Canvas is logically treated as that Canvas in the ToC
const isLogicalLeaf = (node: CozyTOCNode): boolean =>
  node.type === 'range' &&
  node.children.length === 1 &&
  node.children[0].type === 'canvas';

// Canvas or Range this node stands for in ToC navigation
const toNavItem = (node: CozyTOCNode): CozyCanvas | CozyRange =>
  node.type === 'canvas' ? node.source as CozyCanvas
  : isLogicalLeaf(node) ? node.children[0].source as CozyCanvas
  : node.source as CozyRange;

/**
 * Return the Table of Contents for the given CozyRanges.
 */
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
          // This child is a Canvas, i.e. a TOCNode with
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
    const navChildren = node.children.map(toNavItem);

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

  const getNavParent = (canvasId: string): CozyRange | undefined => {
    const node = index.get(canvasId);
    if (!node || node.type !== 'canvas') return;

    const parent = node.parent;
    if (!parent || parent.type !== 'range') return;

    if (isLogicalLeaf(parent))
      return parent.parent?.type === 'range'
        ? parent.parent.source as CozyRange
        : undefined;

    return parent.source as CozyRange;
  }

  const enumerateNodes = (type?: 'range' | 'canvas'): CozyTOCNode[] => {
    const all = Array.from(index.values());
    return type ? all.filter(n => n.type === type) : all;
  }

  return { root, enumerateNodes, getBreadcrumbs, getNavParent, getNode };
}
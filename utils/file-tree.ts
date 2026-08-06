import type { ExtractedFile } from '@/types/analysis';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  file?: ExtractedFile;
}

function joinPath(parent: string, child: string): string {
  if (!parent) return child;
  if (parent.endsWith('/')) return `${parent}${child}`;
  return `${parent}/${child}`;
}

export function buildFileTree(files: ExtractedFile[]): FileNode {
  const root: FileNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: [],
  };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let current = root;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const childPath = joinPath(current.path, segment);
      let next = current.children.find((c) => c.name === segment);

      if (!next) {
        next = {
          name: segment,
          path: childPath,
          isDirectory: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.children.push(next);
      } else if (isLast) {
        next.file = file;
        next.isDirectory = false;
      }

      current = next;
    });
  }

  const sortRecursively = (node: FileNode) => {
    node.children.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
    node.children.forEach(sortRecursively);
  };

  sortRecursively(root);
  return root;
}

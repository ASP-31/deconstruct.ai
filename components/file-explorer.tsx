'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/utils/file-tree';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileExplorerProps {
  tree: FileNode;
  activePath: string | null;
  onSelect: (node: FileNode) => void;
}

export function FileExplorer({ tree, activePath, onSelect }: FileExplorerProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 text-sm">
        {tree.children.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">No files.</p>
        )}
        {tree.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={0}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onSelect: (node: FileNode) => void;
}

function TreeNode({ node, depth, activePath, onSelect }: TreeNodeProps) {
  const isActive = activePath === node.path;
  const [open, setOpen] = useState(depth < 2);

  const icon = useMemo(() => {
    if (node.isDirectory) {
      return open ? (
        <FolderOpen className="h-4 w-4 text-sky-400" />
      ) : (
        <Folder className="h-4 w-4 text-sky-400/80" />
      );
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  }, [node.isDirectory, open]);

  if (node.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-accent/60',
            isActive && 'bg-accent'
          )}
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {icon}
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={cn(
        'flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-accent/60',
        isActive && 'bg-accent text-accent-foreground'
      )}
      style={{ paddingLeft: depth * 12 + 20 }}
    >
      {icon}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

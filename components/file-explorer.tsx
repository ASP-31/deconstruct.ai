'use client';

import { memo, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/utils/file-tree';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileExplorerProps {
  tree: FileNode;
  activePath: string | null;
  onSelect: (node: FileNode) => void;
}

export const FileExplorer = memo(function FileExplorer({ tree, activePath, onSelect }: FileExplorerProps) {
  const flatRows = useMemo(() => flattenVisible(tree), [tree]);

  if (flatRows.length > 220) {
    return <VirtualFileList rows={flatRows} activePath={activePath} onSelect={onSelect} />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 text-sm">
        {tree.children.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No files.</p>}
        {tree.children.map((child) => (
          <TreeNode key={child.path} node={child} depth={0} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    </ScrollArea>
  );
});

interface FlatRow {
  node: FileNode;
  depth: number;
}

function flattenVisible(root: FileNode): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (node: FileNode, depth: number) => {
    for (const child of node.children) {
      if (child.isDirectory) {
        rows.push({ node: child, depth });
        walk(child, depth + 1);
      } else {
        rows.push({ node: child, depth });
      }
    }
  };
  walk(root, 0);
  return rows;
}

function VirtualFileList({ rows, activePath, onSelect }: { rows: FlatRow[]; activePath: string | null; onSelect: (n: FileNode) => void }) {
  const parentRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  });

  return (
    <div ref={(el) => { parentRef.current = el; }} className="h-full overflow-auto p-2">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          const isActive = activePath === row.node.path;
          return (
            <div
              key={vi.key}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
            >
              <button
                type="button"
                onClick={() => !row.node.isDirectory && onSelect(row.node)}
                className={cn('flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-sm hover:bg-white/5', isActive && 'bg-white/10 text-foreground')}
                style={{ paddingLeft: row.depth * 12 + 8 }}
              >
                {row.node.isDirectory ? <Folder className="h-4 w-4 shrink-0 text-sky-400/80" /> : <File className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="truncate">{row.node.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TreeNode = memo(function TreeNode({ node, depth, activePath, onSelect }: { node: FileNode; depth: number; activePath: string | null; onSelect: (node: FileNode) => void }) {
  const isActive = activePath === node.path;
  const [open, setOpen] = useState(depth < 2);

  if (node.isDirectory) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn('flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-white/5', isActive && 'bg-white/10')}
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          {open ? <FolderOpen className="h-4 w-4 shrink-0 text-sky-400" /> : <Folder className="h-4 w-4 shrink-0 text-sky-400/80" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} />
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(node)}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.12 }}
      className={cn('flex w-full items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-white/5', isActive && 'bg-white/10 text-foreground')}
      style={{ paddingLeft: depth * 12 + 20 }}
    >
      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </motion.button>
  );
});

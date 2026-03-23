'use client';

import { useEffect, useState } from 'react';
import { useReactFlow, XYPosition } from '@infinit-canvas/react';

import { AppNodeType } from '@/app/workflow/components/nodes';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { useAppStore } from '@/app/workflow/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDropdown } from '@/hooks/use-dropdown';
import { nodesConfig } from '../config';

export default function FlowContextMenu() {
  const { ref, isOpen, toggleDropdown } = useDropdown();
  const [position, setPosition] = useState<XYPosition | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const addNodeByType = useAppStore((s) => s.addNodeByType);

  const onItemClick = (nodeType: AppNodeType) => {
    if (!position) {
      return;
    }
    const sidebarWidth =
      document.querySelector('[data-slot="sidebar"]')?.clientWidth ?? 0;
    addNodeByType(
      nodeType,
      screenToFlowPosition({
        x: position.x + sidebarWidth,
        y: position.y,
      }),
    );
  };

  useEffect(() => {
    const onContextMenu = (event: Event) => {
      event.preventDefault();
      const mouseEvent = event as MouseEvent;
      const sidebarWidth =
        document.querySelector('[data-slot="sidebar"]')?.clientWidth ?? 0;
      setPosition({
        x: mouseEvent.clientX - sidebarWidth,
        y: mouseEvent.clientY,
      });
      toggleDropdown();
    };

    document
      .querySelector('.react-flow__pane')
      ?.addEventListener('contextmenu', onContextMenu);

    return () => {
      document
        .querySelector('.react-flow__pane')
        ?.removeEventListener('contextmenu', onContextMenu);
    };
  }, [screenToFlowPosition, toggleDropdown]);

  return (
    isOpen && (
      <div
        ref={ref}
        className="absolute z-50"
        style={{
          transform: `translate(${position?.x}px, ${position?.y}px)`,
        }}
      >
        <DropdownMenu open>
          <DropdownMenuTrigger />
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel className="font-bold">
              Add Node
            </DropdownMenuLabel>

            {Object.values(nodesConfig).map((item) => {
              const IconComponent = item?.icon
                ? iconMapping[item.icon]
                : undefined;
              return (
                <a key={item.title} onClick={() => onItemClick(item.id)}>
                  <DropdownMenuItem className="flex items-center space-x-2">
                    {IconComponent ? (
                      <IconComponent aria-label={item?.icon} />
                    ) : null}
                    <span>{item.title}</span>
                  </DropdownMenuItem>
                </a>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppNodeType, NodeConfig } from '@/app/workflow/components/nodes';
import { iconMapping } from '@/app/workflow/utils/icon-mapping';
import { nodesConfig } from '../config';

export function FlowDropdownMenu({
  onAddNode,
  filterNodes = () => true,
}: {
  onAddNode: (type: AppNodeType) => void;
  filterNodes?: (node: NodeConfig) => boolean;
}) {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger />
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel className="font-bold">Add Node</DropdownMenuLabel>
        {Object.values(nodesConfig)
          .filter(filterNodes)
          .map((item) => {
            const IconComponent = item?.icon
              ? iconMapping[item.icon]
              : undefined;
            return (
              <a key={item.title} onClick={() => onAddNode(item.id)}>
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
  );
}

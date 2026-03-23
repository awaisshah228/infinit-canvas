import { Grip } from 'lucide-react';

export default function DragHandle() {
  return (
    <div className="not-in-[.selected]:hidden absolute -top-4 -right-3 text-teal-500 cursor-grab active:cursor-grabbing border-2 rounded-md border-teal-500 p-1 bg-white">
      <Grip className="w-4 h-4" />
    </div>
  );
}

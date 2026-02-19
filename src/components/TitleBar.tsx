import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent } from "react";
import { X, Minus, Square } from "lucide-react";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  const handleDragMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest(".window-buttons")) {
      return;
    }

    void appWindow.startDragging();
  };

  const handleDragDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".window-buttons")) {
      return;
    }

    void appWindow.toggleMaximize();
  };

  return (
    <div
      className="window-controls"
      data-tauri-drag-region
      role="toolbar"
      aria-label="Window controls"
      onMouseDown={handleDragMouseDown}
      onDoubleClick={handleDragDoubleClick}
    >
      <div className="window-drag-zone flex-1" data-tauri-drag-region aria-hidden="true" />
      <div className="window-buttons inline-flex h-full">
        <button
          className="window-button inline-flex h-full w-[46px] items-center justify-center"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          className="window-button inline-flex h-full w-[46px] items-center justify-center"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => appWindow.toggleMaximize()}
          title="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          className="window-button close inline-flex h-full w-[46px] items-center justify-center"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => appWindow.close()}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

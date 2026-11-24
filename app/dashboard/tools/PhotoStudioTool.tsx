"use client";

import { useState } from "react";
import CropResizeTool from "./CropResizeTool";
import PSCPhotoTool from "./PSCPhotoTool";

type PhotoStudioMode = "crop" | "psc";

interface PhotoStudioToolProps {
  onClose: () => void;
  standalone?: boolean;
}

/**
 * Keeps both existing tools mounted inside one Photo Studio entry.
 * Switching modes hides the inactive tool instead of unmounting it,
 * preserving each tool's in-progress form/photo state.
 */
export default function PhotoStudioTool({ onClose, standalone = false }: PhotoStudioToolProps) {
  const [activeMode, setActiveMode] = useState<PhotoStudioMode>("crop");

  return (
    <>
      <CropResizeTool
        onClose={onClose}
        isActive={activeMode === "crop"}
        standalone={standalone}
        onSwitchMode={setActiveMode}
      />
      <PSCPhotoTool
        onClose={onClose}
        isActive={activeMode === "psc"}
        standalone={standalone}
        onSwitchMode={setActiveMode}
      />
    </>
  );
}

import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

export interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultPath?: string;
  /** In web browsers, only directory names can be extracted. Tauri gets full paths. */
  mode?: "file" | "directory";
}

/**
 * Cross-platform directory/file picker component
 * - Tauri: Opens native OS dialog, returns full absolute path
 * - Web: Opens browser file picker, returns folder name only (user must type full path)
 */
export function DirectoryPicker({
  value,
  onChange,
  onError,
  placeholder = "/home/user/projects/my-project",
  disabled = false,
  className = "",
  defaultPath,
  mode = "directory",
}: DirectoryPickerProps) {
  const [isOpening, setIsOpening] = useState(false);

  // Detect if running in Tauri
  // In Tauri v2, check for __TAURI_INTERNALS__ or try importing the API
  const isTauri =
    typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

  const handleBrowse = async () => {
    if (disabled) return;

    // Debug logging
    if (typeof window !== "undefined") {
      console.log(
        "[DirectoryPicker] Window keys containing TAURI:",
        Object.keys(window).filter((k) => k.includes("TAURI")),
      );
    }

    console.log("[DirectoryPicker] === BROWSE CLICKED === Mode:", mode, "IsTauri:", isTauri);
    setIsOpening(true);

    try {
      if (isTauri) {
        // Tauri: Use native dialog
        console.log("[DirectoryPicker] Calling openTauriDialog...");
        await openTauriDialog();
      } else {
        // Web: Use browser file input
        console.log("[DirectoryPicker] Calling openWebDialog...");
        openWebDialog();
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
      onError?.("Failed to open directory picker");
    } finally {
      setIsOpening(false);
    }
  };

  const openTauriDialog = async () => {
    try {
      if (mode === "directory") {
        // Use our custom pick_folder command which uses rfd directly
        // This provides better GTK folder selection behavior
        console.log("[DirectoryPicker] Opening folder picker with custom command");

        const { invoke } = await import("@tauri-apps/api/core");
        const selected = await invoke<string | null>("pick_folder", {
          defaultPath: defaultPath,
        });

        console.log("[DirectoryPicker] Dialog returned:", selected);

        if (selected) {
          console.log("[DirectoryPicker] Setting path:", selected);
          onChange(selected);
        } else {
          console.log("[DirectoryPicker] No selection or dialog cancelled");
        }
      } else {
        // File mode - use standard open dialog
        const { open } = await import("@tauri-apps/plugin-dialog");

        const selected = await open({
          directory: false,
          multiple: false,
          defaultPath: defaultPath,
          title: "Select File",
        });

        if (selected && typeof selected === "string") {
          onChange(selected);
        }
      }
    } catch (error) {
      console.error("Tauri dialog error:", error);
      onError?.(`Failed to open directory picker: ${error}`);
    }
  };

  const openWebDialog = () => {
    // Create hidden file input
    const input = document.createElement("input");
    input.type = "file";

    if (mode === "directory") {
      // @ts-expect-error - webkitdirectory is not in TypeScript types
      input.webkitdirectory = true;
      input.multiple = true;
    }

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const firstFile = target.files[0];

        if (mode === "directory") {
          // Extract folder name from webkitRelativePath
          const relativePath = firstFile.webkitRelativePath || firstFile.name;
          const folderName = relativePath.split("/")[0];
          onChange(folderName);
          onError?.("Please enter the complete path to this folder");
        } else {
          // File mode - just set the filename
          onChange(firstFile.name);
        }
      }

      // Cleanup
      document.body.removeChild(input);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
    };

    // Trigger picker
    document.body.appendChild(input);
    input.click();
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleBrowse}
        disabled={disabled || isOpening}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        {isOpening ? "Opening..." : "Browse"}
      </Button>
    </div>
  );
}

/**
 * Helper text component to show environment-specific instructions
 */
export function DirectoryPickerHelp() {
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  return (
    <p className="text-muted-foreground text-xs">
      {isTauri
        ? "Click Browse to select a folder or enter the path manually"
        : "Enter the complete path. The Browse button can help you find the folder, but you must type the full path (web browser limitation)"}
    </p>
  );
}

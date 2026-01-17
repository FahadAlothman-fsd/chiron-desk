import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_PATH_CHARS = /[<>:"|?*]/;
const FOLDER_NAME_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9_\-.]*$/;
const MAX_FOLDER_NAME_LENGTH = 255;

interface FolderNameValidationResult {
  valid: boolean;
  error?: string;
}

function validateFolderName(name: string): FolderNameValidationResult {
  if (!name) {
    return { valid: false, error: "Folder name is required" };
  }

  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    return {
      valid: false,
      error: "Folder name is too long (max 255 characters)",
    };
  }

  if (INVALID_PATH_CHARS.test(name)) {
    return { valid: false, error: 'Folder name cannot contain < > : " | ? *' };
  }

  if (WINDOWS_RESERVED_NAMES.test(name)) {
    return {
      valid: false,
      error: `'${name.toUpperCase()}' is a reserved system name`,
    };
  }

  if (!FOLDER_NAME_REGEX.test(name)) {
    return {
      valid: false,
      error: "Folder name must start with a letter, number, or dot",
    };
  }

  return { valid: true };
}

export interface TwoPartDirectoryInputProps {
  value: string;
  onChange: (fullPath: string, isValid: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  defaultPath?: string;
  folderNamePlaceholder?: string;
}

export function TwoPartDirectoryInput({
  value,
  onChange,
  onError,
  disabled = false,
  className = "",
  defaultPath,
  folderNamePlaceholder = "new-folder-name",
}: TwoPartDirectoryInputProps) {
  const [isOpening, setIsOpening] = useState(false);

  const separatorIndex = value.lastIndexOf("/");
  const initialParentPath =
    separatorIndex > 0 ? value.substring(0, separatorIndex) : defaultPath || "~";
  const initialFolderName = separatorIndex > 0 ? value.substring(separatorIndex + 1) : "";

  const [parentPath, setParentPath] = useState(initialParentPath);
  const [folderName, setFolderName] = useState(initialFolderName);
  const [folderError, setFolderError] = useState<string>("");

  const isTauri =
    typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

  const handleParentBrowse = async () => {
    if (disabled) return;
    setIsOpening(true);

    try {
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        const selected = await invoke<string | null>("pick_folder", {
          defaultPath: parentPath !== "~" ? parentPath : defaultPath,
        });

        if (selected) {
          setParentPath(selected);
          const validation = validateFolderName(folderName);
          const fullPath = `${selected}/${folderName}`;
          onChange(fullPath, validation.valid && folderName.length > 0);
        }
      } else {
        openWebDialog();
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
      onError?.("Failed to open directory picker");
    } finally {
      setIsOpening(false);
    }
  };

  const openWebDialog = () => {
    const input = document.createElement("input");
    input.type = "file";
    (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
    input.multiple = true;

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const firstFile = target.files[0];
        const relativePath = firstFile.webkitRelativePath || firstFile.name;
        const folderNameFromPicker = relativePath.split("/")[0];
        setParentPath(folderNameFromPicker);
        onError?.("Please enter the complete parent path (web browser limitation)");

        const validation = validateFolderName(folderName);
        const fullPath = `${folderNameFromPicker}/${folderName}`;
        onChange(fullPath, validation.valid && folderName.length > 0);
      }
      document.body.removeChild(input);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleFolderNameChange = (newName: string) => {
    setFolderName(newName);

    if (!newName) {
      setFolderError("");
      onChange(`${parentPath}/`, false);
      return;
    }

    const validation = validateFolderName(newName);
    setFolderError(validation.error || "");

    const fullPath = `${parentPath}/${newName}`;
    onChange(fullPath, validation.valid);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={handleParentBrowse}
          disabled={disabled || isOpening}
          className="rounded-r-none border-r-0 px-3"
          aria-label="Parent directory"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          <span className="max-w-40 truncate font-mono text-sm">{parentPath}/</span>
        </Button>
        <Input
          value={folderName}
          onChange={(e) => handleFolderNameChange(e.target.value)}
          placeholder={folderNamePlaceholder}
          disabled={disabled}
          className={`rounded-l-none font-mono ${folderError ? "border-destructive" : ""}`}
          aria-label="New folder name"
          aria-describedby={folderError ? "folder-name-error" : undefined}
        />
      </div>
      {folderError && (
        <p id="folder-name-error" className="text-destructive text-sm" role="alert">
          {folderError}
        </p>
      )}
      {value && !folderError && folderName && (
        <p className="text-muted-foreground truncate font-mono text-xs">
          Will create: {parentPath}/{folderName}
        </p>
      )}
    </div>
  );
}

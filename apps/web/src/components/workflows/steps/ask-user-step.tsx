import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DirectoryPicker, DirectoryPickerHelp } from "@/components/ui/directory-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AskUserStepConfig {
  type: "ask-user";
  message?: string;
  question: string;
  responseType: "boolean" | "string" | "number" | "choice" | "path";
  responseVariable: string;
  pathConfig?: {
    startPath?: string;
    selectMode: "file" | "directory";
    mustExist?: boolean;
  };
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface AskUserStepProps {
  config: AskUserStepConfig;
  onSubmit: (value: unknown) => void;
  loading: boolean;
  error?: string;
}

export function AskUserStep({ config, onSubmit, loading, error }: AskUserStepProps) {
  const [value, setValue] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    // Clear previous validation error
    setValidationError("");

    // Validate based on response type
    if (config.validation?.required && !value) {
      setValidationError("This field is required");
      return;
    }

    // Validate path if responseType is "path"
    if (config.responseType === "path") {
      setIsValidating(true);

      try {
        // Check if we're in Tauri
        const isTauri =
          typeof window !== "undefined" &&
          ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

        if (isTauri) {
          const { invoke } = await import("@tauri-apps/api/core");

          const result = await invoke<{
            valid: boolean;
            exists: boolean;
            is_directory: boolean;
            is_empty: boolean;
            error?: string;
          }>("validate_directory_path", {
            path: value,
            mustExist: config.pathConfig?.mustExist ?? false,
            mustBeEmpty: true, // For now, always require empty directory
          });

          if (!result.valid) {
            setValidationError(result.error || "Invalid directory path");
            setIsValidating(false);
            return;
          }

          // Warn if directory exists but is not empty (unless they're selecting existing)
          if (result.exists && !result.is_empty && !config.pathConfig?.mustExist) {
            setValidationError(
              "Directory exists and is not empty. Please select an empty directory.",
            );
            setIsValidating(false);
            return;
          }
        }
      } catch (err) {
        console.error("Path validation error:", err);
        setValidationError(`Validation failed: ${err}`);
        setIsValidating(false);
        return;
      } finally {
        setIsValidating(false);
      }
    }

    if (config.responseType === "string" && config.validation) {
      if (config.validation.minLength && value.length < config.validation.minLength) {
        setValidationError(`Must be at least ${config.validation.minLength} characters`);
        return;
      }
      if (config.validation.maxLength && value.length > config.validation.maxLength) {
        setValidationError(`Must be at most ${config.validation.maxLength} characters`);
        return;
      }
      if (config.validation.pattern) {
        const regex = new RegExp(config.validation.pattern);
        if (!regex.test(value)) {
          setValidationError("Does not match required pattern");
          return;
        }
      }
    }

    if (config.responseType === "number") {
      const num = Number.parseFloat(value);
      if (Number.isNaN(num)) {
        setValidationError("Must be a valid number");
        return;
      }
      if (config.validation?.min !== undefined && num < config.validation.min) {
        setValidationError(`Must be at least ${config.validation.min}`);
        return;
      }
      if (config.validation?.max !== undefined && num > config.validation.max) {
        setValidationError(`Must be at most ${config.validation.max}`);
        return;
      }
    }

    // Submit the value
    onSubmit(config.responseType === "number" ? Number.parseFloat(value) : value);
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      {config.message && <div className="text-muted-foreground text-sm">{config.message}</div>}

      <div className="space-y-2">
        <Label htmlFor="user-input">{config.question}</Label>

        {config.responseType === "path" ? (
          <div className="space-y-2">
            <DirectoryPicker
              value={value}
              onChange={(path) => {
                setValue(path);
                setValidationError("");
              }}
              onError={(err) => setValidationError(err)}
              disabled={loading}
              defaultPath={config.pathConfig?.startPath}
              mode={config.pathConfig?.selectMode || "directory"}
              className={validationError || error ? "border-destructive" : ""}
            />
            <DirectoryPickerHelp />
          </div>
        ) : config.responseType === "string" || config.responseType === "number" ? (
          <Input
            id="user-input"
            type={config.responseType === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setValidationError("");
            }}
            disabled={loading}
            className={validationError || error ? "border-destructive" : ""}
          />
        ) : (
          <div className="text-muted-foreground text-sm">
            Response type "{config.responseType}" not yet implemented
          </div>
        )}

        {(validationError || error) && (
          <Alert variant="destructive">
            <AlertDescription>{validationError || error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || isValidating || !value || !!validationError}
        className="w-full"
      >
        {loading || isValidating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isValidating ? "Validating..." : "Submitting..."}
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}

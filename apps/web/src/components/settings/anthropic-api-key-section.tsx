import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc, trpcClient } from "@/utils/trpc";

type Status = "valid" | "invalid" | "not-configured" | "testing";

export function AnthropicApiKeySection() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>("not-configured");
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();

  // Get existing API key
  const { data: keyData, isLoading } = trpc.settings.getAnthropicApiKey.useQuery();

  // Mutations
  const saveKeyMutation = useMutation({
    mutationFn: (key: string) => trpcClient.settings.saveAnthropicApiKey.mutate({ key }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["settings", "getAnthropicApiKey"]],
      });
      setStatus("valid");
      setIsEditing(false);
      setShowKey(false);
      toast.success("Anthropic API key saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: () => trpcClient.settings.removeAnthropicApiKey.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [["settings", "getAnthropicApiKey"]],
      });
      setApiKey("");
      setStatus("not-configured");
      setIsEditing(false);
      toast.success("Anthropic API key removed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to remove API key: ${error.message}`);
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: (key: string) => trpcClient.settings.testAnthropicApiKey.mutate({ key }),
    onSuccess: (data) => {
      setStatus(data.valid ? "valid" : "invalid");
      if (data.valid) {
        toast.success("Anthropic API key is valid");
      } else {
        toast.error("Anthropic API key is invalid");
      }
    },
    onError: (error) => {
      setStatus("invalid");
      toast.error(`Failed to test API key: ${error.message}`);
    },
  });

  // Initialize API key from query data
  const existingKey = keyData?.key;
  const displayKey = isEditing || !existingKey ? apiKey : keyData?.maskedKey || "";

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    // Test the API key first before saving
    setStatus("testing");
    try {
      const result = await testKeyMutation.mutateAsync(apiKey);

      if (!result.valid) {
        setStatus("invalid");
        toast.error("Cannot save invalid API key. Please check your key and try again.");
        return;
      }

      // Key is valid, save it
      saveKeyMutation.mutate(apiKey);
    } catch (_error) {
      setStatus("invalid");
      toast.error("Failed to validate API key before saving");
    }
  };

  const handleTest = () => {
    if (!apiKey.trim()) return;
    setStatus("testing");
    testKeyMutation.mutate(apiKey);
  };

  const handleRemove = () => {
    if (confirm("Are you sure you want to remove this API key?")) {
      removeKeyMutation.mutate();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setApiKey(existingKey || "");
    setShowKey(true);
  };

  const getStatusBadge = () => {
    switch (status) {
      case "valid":
        return (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Valid
          </div>
        );
      case "invalid":
        return (
          <div className="flex items-center gap-1 text-destructive text-sm">
            <X className="h-4 w-4" />
            Invalid
          </div>
        );
      case "testing":
        return (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Testing...
          </div>
        );
      default:
        return <div className="text-muted-foreground text-sm">Not configured</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="anthropic-key">Anthropic API Key (Optional)</Label>
        <p className="text-muted-foreground text-xs">
          Use your Claude API key as a fallback when OpenRouter is unavailable
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="anthropic-key"
              type={showKey ? "text" : "password"}
              value={displayKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (!isEditing) setIsEditing(true);
              }}
              placeholder="sk-ant-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-3"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!apiKey.trim() || status === "testing" || testKeyMutation.isPending}
          >
            {status === "testing" || testKeyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Test"
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>{getStatusBadge()}</div>
          <div className="flex gap-2">
            {existingKey && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit} disabled={isEditing}>
                  Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removeKeyMutation.isPending}
                >
                  {removeKeyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              </>
            )}
            {isEditing && (
              <Button
                onClick={handleSave}
                disabled={!apiKey.trim() || saveKeyMutation.isPending}
                size="sm"
              >
                {saveKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

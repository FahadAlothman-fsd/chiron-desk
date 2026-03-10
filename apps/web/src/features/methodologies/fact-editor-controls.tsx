import { useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-9 border border-border/70 bg-background px-3 text-sm text-foreground outline-none rounded-none";

export function AllowedValuesChipEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draftValue, setDraftValue] = useState("");

  const addDraftValue = () => {
    const next = draftValue.trim();
    if (!next || values.includes(next)) {
      return;
    }
    onChange([...values, next]);
    setDraftValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          aria-label="Allowed value input"
          className={fieldClassName}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraftValue();
              return;
            }

            if (event.key === "Backspace" && draftValue.length === 0 && values.length > 0) {
              event.preventDefault();
              onChange(values.slice(0, -1));
            }
          }}
        />
        <Button type="button" variant="outline" className="rounded-none" onClick={addDraftValue}>
          Add allowed value
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="chiron-frame-flat inline-flex items-center gap-1 px-2 py-1 text-xs"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((entry) => entry !== value))}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

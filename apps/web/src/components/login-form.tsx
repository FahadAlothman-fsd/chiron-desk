import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

import { toast } from "sonner";

type LoginFormProps = {
  mode: "signin" | "signup";
  onToggleMode: () => void;
};

export function LoginForm({ mode, onToggleMode }: LoginFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);

        if (mode === "signin") {
          authClient.signIn.email(
            {
              email,
              password,
            },
            {
              onSuccess: () => {
                toast.success("Signed in");
                setPending(false);
              },
              onError: ({ error }) => {
                toast.error(error.message || "Sign in failed");
                setPending(false);
              },
            },
          );
          return;
        }

        authClient.signUp.email(
          {
            name,
            email,
            password,
          },
          {
            onSuccess: () => {
              toast.success("Account created");
              setPending(false);
            },
            onError: ({ error }) => {
              toast.error(error.message || "Sign up failed");
              setPending(false);
            },
          },
        );
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-start gap-1 text-left">
          <h1 className="text-2xl font-bold uppercase tracking-[0.12em]">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "signin"
              ? "Continue into your existing Chiron workspace"
              : "Create an operator account for setup, guidance, and runtime work"}
          </p>
        </div>

        {mode === "signup" ? (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              placeholder="Jane Operator"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="operator@chiron.local"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder={mode === "signin" ? "Enter your password" : "Create a secure password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        <Field>
          <Button type="submit" className="uppercase tracking-[0.12em]" disabled={pending}>
            {pending
              ? mode === "signin"
                ? "Signing In..."
                : "Creating..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </Field>

        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-muted dark:*:data-[slot=field-separator-content]:bg-card">
          Security Notice
        </FieldSeparator>

        <FieldDescription className="text-center">
          {mode === "signin" ? "Need an account first?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              if (!pending) {
                onToggleMode();
              }
            }}
          >
            {mode === "signin" ? "Create one" : "Sign in instead"}
          </button>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}

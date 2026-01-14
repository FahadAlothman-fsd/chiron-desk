import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AskUserStepConfig } from "./ask-user-step";
import { AskUserStep } from "./ask-user-step";

describe("AskUserStep", () => {
  const pathConfig: AskUserStepConfig = {
    type: "ask-user",
    question: "Select your project directory",
    message: "Let's set up your project! Where would you like to create it?",
    responseType: "path",
    responseVariable: "project_path",
    pathConfig: {
      selectMode: "directory",
      mustExist: false,
    },
    validation: {
      required: true,
    },
  };

  const stringConfig: AskUserStepConfig = {
    type: "ask-user",
    question: "Enter project name",
    responseType: "string",
    responseVariable: "project_name",
    validation: {
      required: true,
      minLength: 3,
      maxLength: 50,
    },
  };

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    cleanup();
  });

  describe("path selector", () => {
    it("renders path selector correctly", () => {
      render(<AskUserStep config={pathConfig} onSubmit={mock(() => {})} loading={false} />);

      expect(screen.getByText(pathConfig.message!)).toBeInTheDocument();
      expect(screen.getByText(pathConfig.question)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
    });

    it("allows manual path input", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={pathConfig} onSubmit={onSubmit} loading={false} />);

      // Find input by its textbox role (DirectoryPicker renders an input)
      const inputs = screen.getAllByRole("textbox");
      const input = inputs[0]; // DirectoryPicker input is the first textbox
      await user.type(input, "/home/user/my-project");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      expect(onSubmit).toHaveBeenCalledWith("/home/user/my-project");
    });

    it("shows validation error for empty required path", async () => {
      const _user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={pathConfig} onSubmit={onSubmit} loading={false} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });

      // Button should be disabled when empty
      expect(continueButton).toBeDisabled();
    });

    it("disables submit button during loading", () => {
      render(<AskUserStep config={pathConfig} onSubmit={mock(() => {})} loading={true} />);

      const continueButton = screen.getByRole("button", {
        name: /submitting/i,
      });
      expect(continueButton).toBeDisabled();
    });
  });

  describe("string input", () => {
    it("renders string input correctly", () => {
      render(<AskUserStep config={stringConfig} onSubmit={mock(() => {})} loading={false} />);

      expect(screen.getByLabelText(stringConfig.question)).toBeInTheDocument();
    });

    it("validates minimum length", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={stringConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(stringConfig.question);
      await user.type(input, "ab"); // Too short

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("validates maximum length", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={stringConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(stringConfig.question);
      const longString = "a".repeat(51); // Too long
      await user.type(input, longString);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at most 50 characters/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits valid string input", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={stringConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(stringConfig.question);
      await user.type(input, "My Project");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      expect(onSubmit).toHaveBeenCalledWith("My Project");
    });
  });

  describe("number input", () => {
    const numberConfig: AskUserStepConfig = {
      type: "ask-user",
      question: "Enter count",
      responseType: "number",
      responseVariable: "item_count",
      validation: {
        min: 1,
        max: 100,
      },
    };

    it("validates minimum value", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={numberConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(numberConfig.question);
      await user.type(input, "0");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 1/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("validates maximum value", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={numberConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(numberConfig.question);
      await user.type(input, "150");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at most 100/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits valid number as number type", async () => {
      const user = userEvent.setup();
      const onSubmit = mock(() => {});

      render(<AskUserStep config={numberConfig} onSubmit={onSubmit} loading={false} />);

      const input = screen.getByLabelText(numberConfig.question);
      await user.type(input, "42");

      const continueButton = screen.getByRole("button", { name: /continue/i });
      await user.click(continueButton);

      expect(onSubmit).toHaveBeenCalledWith(42);
    });
  });

  describe("error display", () => {
    it("displays server error", () => {
      render(
        <AskUserStep
          config={pathConfig}
          onSubmit={mock(() => {})}
          loading={false}
          error="Invalid path: Parent directory does not exist"
        />,
      );

      expect(screen.getByText(/invalid path/i)).toBeInTheDocument();
    });
  });
});

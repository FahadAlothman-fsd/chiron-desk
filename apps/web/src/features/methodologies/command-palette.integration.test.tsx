import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MethodologyCommandPalette } from "./command-palette";

const navigateMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const mutateMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

const listQueryKey = ["methodology", "list"] as const;
const detailsQueryKey = ["methodology", "details", "equity-core"] as const;

const listData = [
  {
    methodologyId: "m1",
    methodologyKey: "equity-core",
    displayName: "Equity Core",
    hasDraftVersion: true,
    availableVersions: 1,
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
];

const detailsData = {
  methodologyId: "m1",
  methodologyKey: "equity-core",
  displayName: "Equity Core",
  descriptionJson: {},
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  versions: [
    {
      id: "draft-v2",
      version: "0.2.0",
      status: "draft",
      displayName: "Equity Draft",
      createdAt: "2026-03-02T00:00:00.000Z",
      retiredAt: null,
    },
  ],
};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("@/utils/orpc", () => {
  return {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args),
    },
    orpc: {
      methodology: {
        listMethodologies: {
          queryOptions: () => ({
            queryKey: listQueryKey,
            queryFn: async () => listData,
          }),
        },
        getMethodologyDetails: {
          queryOptions: ({ input }: { input: { methodologyKey: string } }) => ({
            queryKey: ["methodology", "details", input.methodologyKey],
            queryFn: async () => detailsData,
          }),
        },
        createDraftVersion: {
          mutationOptions: (options: Record<string, unknown>) => options,
        },
      },
    },
  };
});

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  navigateMock.mockReset();
  invalidateQueriesMock.mockReset();
  mutateMock.mockReset();
  useQueryMock.mockReset();
  useMutationMock.mockReset();

  invalidateQueriesMock.mockResolvedValue(undefined);
  navigateMock.mockResolvedValue(undefined);

  let queryCall = 0;
  useQueryMock.mockImplementation(() => {
    queryCall += 1;
    return queryCall === 1 ? { data: listData } : { data: detailsData };
  });

  useMutationMock.mockImplementation((options: { onSuccess?: (...args: unknown[]) => unknown }) => {
    const mutate = (variables: unknown) => {
      mutateMock(variables);
      if (options.onSuccess) {
        void options.onSuccess({ version: { id: "draft-v3" } }, variables, undefined, undefined);
      }
    };

    return {
      mutate,
      isPending: false,
    };
  });
});

afterEach(() => {
  cleanup();
});

describe("MethodologyCommandPalette integration", () => {
  it("navigates to create methodology flow from command action", () => {
    const onOpenChange = vi.fn();

    render(
      <MethodologyCommandPalette open onOpenChange={onOpenChange} selectedMethodologyKey={null} />,
    );

    fireEvent.click(screen.getByText("Create Methodology"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/methodologies",
      search: { intent: "create-methodology" },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens existing draft workspace from command action", () => {
    const onOpenChange = vi.fn();

    render(
      <MethodologyCommandPalette
        open
        onOpenChange={onOpenChange}
        selectedMethodologyKey="equity-core"
      />,
    );

    fireEvent.click(screen.getByText("Open Existing Draft"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/methodologies/$methodologyId/versions/$versionId",
      params: {
        methodologyId: "equity-core",
        versionId: "draft-v2",
      },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates draft and invalidates deterministic query keys", async () => {
    render(
      <MethodologyCommandPalette
        open
        onOpenChange={vi.fn()}
        selectedMethodologyKey="equity-core"
      />,
    );

    fireEvent.click(screen.getByText("Create Draft Version"));

    expect(mutateMock).toHaveBeenCalledWith({
      methodologyKey: "equity-core",
      displayName: "Equity Core Draft 2",
      version: "0.2.0",
      workUnitTypes: [{ key: "task" }],
      transitions: [{ key: "start" }],
      agentTypes: [],
    });

    await waitFor(() => {
      expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, { queryKey: listQueryKey });
      expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, { queryKey: detailsQueryKey });
      expect(navigateMock).toHaveBeenLastCalledWith({
        to: "/methodologies/$methodologyId/versions/$versionId",
        params: {
          methodologyId: "equity-core",
          versionId: "draft-v3",
        },
      });
    });
  });

  it("supports keyboard group cycling with Tab on the command list", () => {
    const scrollSpy = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView");

    render(
      <MethodologyCommandPalette
        open
        onOpenChange={vi.fn()}
        selectedMethodologyKey="equity-core"
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Navigate, create, or open methodology..."), {
      key: "Tab",
    });

    expect(scrollSpy).toHaveBeenCalled();
    scrollSpy.mockRestore();
  });
});

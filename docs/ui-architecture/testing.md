
Based on your React/TypeScript/Vitest stack, here's the comprehensive testing architecture for your frontend.

### Component Test Template

Here's a basic component test template using Vitest, React Testing Library, and TanStack Query testing utilities:

```typescript
// components/__tests__/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatInterface } from '../chat/ChatInterface';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/useProjectStore';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    messages: {
      create: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
          error: null,
        })),
      },
    },
    chat: {
      stream: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
        })),
      },
    },
  },
}));

// Mock Zustand store
vi.mock('@/stores/useProjectStore', () => ({
  useProjectStore: vi.fn(() => ({
    currentProject: { id: 'test-project', name: 'Test Project' },
    updateProject: vi.fn(),
  })),
}));

// Mock XState machine
vi.mock('@/machines/bmadWorkflowMachine', () => ({
  bmadWorkflowMachine: {
    context: { projectId: 'test-project' },
  },
}));

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ChatInterface', () => {
  const defaultProps = {
    conversationId: 'test-conversation',
    projectId: 'test-project',
    onArtifactUpdate: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders chat interface correctly', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
  
  it('displays loading state when sending message', async () => {
    const mockMutateAsync = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: true,
      error: null,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });
  
  it('handles message submission correctly', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-message',
      content: 'Test response',
      role: 'assistant',
    });
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: null,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        conversationId: 'test-conversation',
        content: 'Hello AI',
        model: 'default',
      });
    });
  });
  
  it('displays error message when submission fails', async () => {
    const mockError = new Error('API Error');
    const mockMutateAsync = vi.fn().mockRejectedValue(mockError);
    
    vi.mocked(trpc.messages.create.useMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: mockError,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
  
  it('calls onArtifactUpdate when artifact is generated', async () => {
    const mockOnArtifactUpdate = vi.fn();
    const mockStreamResponse = async function* () {
      yield { type: 'content', content: 'Response content' };
      yield { type: 'artifact', artifact: { id: 'test-artifact' } };
    };
    
    vi.mocked(trpc.chat.stream.useMutation).mockReturnValue({
      mutateAsync: vi.fn().mockReturnValue(mockStreamResponse()),
      isLoading: false,
    } as any);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} onArtifactUpdate={mockOnArtifactUpdate} />
      </TestWrapper>
    );
    
    // Simulate streaming completion
    await waitFor(() => {
      expect(mockOnArtifactUpdate).toHaveBeenCalledWith({ id: 'test-artifact' });
    });
  });
  
  it('handles keyboard shortcuts', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    
    // Verify send action was triggered
    expect(vi.mocked(trpc.messages.create.useMutation)().mutateAsync).toHaveBeenCalled();
  });
  
  it('respects max token limit', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    
    // Simulate input exceeding token limit
    fireEvent.change(input, { 
      target: { value: 'a'.repeat(5000) } // Exceeds typical limits
    });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });
});

// Integration test example
describe('ChatInterface Integration', () => {
  it('integrates with project store correctly', () => {
    const mockStore = {
      currentProject: { id: 'test-project', name: 'Test Project' },
      updateProject: vi.fn(),
    };
    
    vi.mocked(useProjectStore).mockReturnValue(mockStore);
    
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
  });
});

// Accessibility test example
describe('ChatInterface Accessibility', () => {
  it('has proper ARIA labels', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', expect.stringContaining('message'));
  });
  
  it('supports keyboard navigation', () => {
    render(
      <TestWrapper>
        <ChatInterface {...defaultProps} />
      </TestWrapper>
    );
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    input.focus();
    expect(document.activeElement).toBe(input);
    
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(document.activeElement).toBe(sendButton);
  });
});
```

### Testing Best Practices

Here are the comprehensive testing best practices for your React/TypeScript/TanStack/XState stack:

1. **Unit Tests**: Test individual components in isolation with mocked dependencies
2. **Integration Tests**: Test component interactions and data flow between components
3. **E2E Tests**: Test critical user flows using Playwright for realistic browser testing
4. **Coverage Goals**: Aim for 80% code coverage with focus on critical paths
5. **Test Structure**: Use Arrange-Act-Assert pattern for clear, readable tests
6. **Mock External Dependencies**: Mock API calls, routing, state management, and external services
7. **Test User Interactions**: Use React Testing Library's user-event for realistic interactions
8. **Accessibility Testing**: Include axe-core or similar for WCAG compliance verification
9. **Performance Testing**: Monitor bundle size and runtime performance in CI/CD
10. **State Machine Testing**: Test XState machines for all state transitions and edge cases
11. **Form Testing**: Validate form submissions, error states, and user input handling
12. **Error Boundary Testing**: Ensure error boundaries catch and display errors appropriately
13. **Responsive Testing**: Test components across different screen sizes and devices
14. **Internationalization Testing**: Verify i18n keys and locale switching if applicable
15. **Concurrent Testing**: Use Vitest's concurrent mode for faster test execution
16. **Snapshot Testing**: Use for UI components to catch unintended visual changes
17. **API Testing**: Test tRPC procedures and OpenRouter integration separately
18. **Custom Hook Testing**: Test custom hooks in isolation with renderHook from RTL
19. **Context Testing**: Test React contexts and providers for proper value propagation
20. **Type Testing**: Leverage TypeScript for compile-time testing of prop types

**Detailed Rationale:**
This testing approach provides:
- **Comprehensive Coverage**: Unit, integration, and E2E tests ensure reliability
- **Developer Experience**: Vitest's speed and TypeScript integration improve productivity
- **Accessibility**: Built-in a11y testing ensures WCAG compliance
- **Performance**: Bundle and runtime monitoring prevents regressions
- **State Management**: Specific testing for XState machines and Zustand stores

Trade-offs include the initial setup time for comprehensive testing, but it prevents bugs and ensures code quality for your complex workflow application.

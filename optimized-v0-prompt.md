# Vercel v0 UI Generation Prompt - Chiron AI Chat Interface

## Project Context
You are creating UI components for Chiron, an AI-powered project management tool that transforms individual developer planning through the BMAD methodology. This is a split-screen workspace with an enhanced chat interface featuring real-time artifact display and interactive components.

## Tech Stack Requirements
- **Framework**: React 19 with TypeScript (strict mode enabled)
- **Routing**: TanStack Router for type-safe navigation  
- **Styling**: TailwindCSS with utility-first approach
- **Components**: shadcn/ui with Radix UI primitives
- **Desktop**: Tauri for cross-platform desktop application
- **Real-time**: WebSocket client for live updates
- **Monorepo**: Turbo for build orchestration

## Design System - Winter Color Palette

### Primary Colors (MUST USE EXACTLY)
- **Charcoal Black**: #2A2C29 - Primary background and text
- **Sage Green**: #A7A597 - Interactive elements and accents  
- **Slate Gray**: #5D6C6A - Secondary UI elements and borders

### Extended Palette
- **Light Sage**: #B8B7A8 - Hover states and subtle accents
- **Dark Charcoal**: #1F211E - Deep backgrounds and shadows
- **Muted Sage**: #8A897B - Disabled states and secondary text
- **Off-White**: #F5F5F4 - Card backgrounds and content areas
- **Error Red**: #C53030 - Error states and destructive actions
- **Success Green**: #2F855A - Success states and confirmations

## Accessibility Requirements (WCAG 2.1 AA Compliance)

### Color Contrast
- Normal text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear focus indicators with 2px outline
- Error states: High contrast with clear visual feedback

### Keyboard Navigation
- Full keyboard accessibility for all interactions
- Logical tab order throughout components
- Escape key closes modals and dropdowns
- Arrow keys navigate within components
- Enter/Space activate buttons and links

### Screen Reader Support
- Comprehensive ARIA labels and descriptions
- Role attributes for all interactive elements
- Live regions for dynamic content updates
- Descriptive error messages and status updates

### Focus Management
- Visible focus indicators (2px solid outline)
- Focus trap in modals and dropdowns
- Focus restoration after interactions
- Skip links for main content navigation

## Responsive Design Specifications

### Breakpoints
- **Desktop**: 1200px+ - Full split-screen layout (50/50 panels)
- **Tablet**: 768px - 1199px - Collapsible panels with overlay
- **Mobile**: 320px - 767px - Stacked layout with tab navigation
- **Ultra-wide**: 1600px+ - Enhanced multi-column support

### Mobile-First Approach
1. Design mobile layout first, then enhance for larger screens
2. Touch-friendly tap targets (minimum 44px)
3. Gesture support for navigation and interactions
4. Simplified controls with overflow menus
5. Bottom sheet patterns for input areas

## Component Architecture

### 1. Enhanced Chat Interface Component
**Purpose**: Primary AI conversation interface with real-time streaming
**Structure**:
- Chat header with model selector and usage tracking
- Messages area with virtual scrolling for performance
- Input area with multi-line support and attachments
- Real-time artifact display within messages

**Key Features**:
- Message streaming with typing indicators
- File attachment support with drag-and-drop
- Model selection with autocomplete
- Token usage visualization
- Voice input capability
- Rich text formatting toolbar

**Visual States**:
- Default: Standard message display
- Streaming: Real-time content updates
- Error: Error state with retry options
- Loading: Skeleton state during processing
- Collapsed: Compact view for long messages

### 2. Split-Screen Workspace Component
**Purpose**: Resizable split-screen layout for chat and artifacts
**Structure**:
- Left panel: Artifact viewer and context management
- Right panel: Chat interface and interactions
- Resizable divider with smooth animations
- Panel headers with navigation controls

**Interaction Patterns**:
- Mouse drag to resize panels (smooth 300ms transitions)
- Keyboard shortcuts: Ctrl+[ and Ctrl+] for size adjustment
- Touch gestures for mobile devices
- Auto-collapse based on content and screen size
- Synchronized scrolling between panels

### 3. Interactive List Component
**Purpose**: Expandable list items for artifacts and context
**Structure**:
- Collapsible item containers
- Expand/collapse animations (200ms ease-out)
- Nested content with proper indentation
- Action buttons and context menus

**Animation Specifications**:
- Expand/collapse: 200ms ease-out transitions
- Hover states: 150ms smooth transitions
- Focus transitions: 200ms outline animations
- Loading indicators: 1s infinite rotation
- Success feedback: 300ms bounce animation

### 4. Model Selection Component
**Purpose**: AI model selection with autocomplete and metadata
**Structure**:
- Searchable dropdown with model descriptions
- Performance indicators and capabilities
- Recent models section
- Favorites and custom model support

**Features**:
- Real-time search filtering
- Model performance metrics
- Context window size display
- Cost per token information
- Model categorization and tags

### 5. Usage Tracking Component
**Purpose**: Real-time display of AI usage metrics
**Structure**:
- Token usage progress bar
- Cost tracking with currency display
- Time tracking for conversations
- Model information and settings

**Visual Indicators**:
- Color-coded token usage (green/yellow/red)
- Animated progress bars
- Real-time cost updates
- Usage history graphs
- Alert thresholds and warnings

## Modern Design Patterns

### Micro-interactions
- Subtle feedback for all user actions
- Button press animations (100ms scale reduction)
- Hover effects with elevation changes
- Focus rings that animate on interaction
- Loading states with skeleton screens

### Progressive Enhancement
- Core functionality loads first
- Enhanced features load progressively
- Offline capability with service workers
- Graceful degradation for older browsers
- Performance optimization with lazy loading

### State Management
- Local component state for UI interactions
- Global state for application-wide data
- Optimistic updates for better perceived performance
- Error boundaries for graceful error handling
- Loading states for all async operations

## Performance Requirements

### Rendering Optimization
- Virtual scrolling for large lists (10,000+ items)
- Memoization for expensive computations
- Debounced updates for real-time features
- Progressive loading for large artifacts
- Image optimization and lazy loading

### Animation Performance
- GPU-accelerated transforms only
- RequestAnimationFrame for smooth animations
- will-change CSS property for animated elements
- Reduced motion support for accessibility
- 60fps target for all interactions

### Memory Management
- Automatic cleanup of event listeners
- Component unmounting with proper disposal
- Garbage collection friendly patterns
- Efficient state management
- Memory leak prevention

## Error Handling Patterns

### Input Validation
- Real-time character counting with visual warnings
- File size limits with clear feedback
- Format validation for attachments
- Model compatibility warnings
- Token limit approaching alerts

### Error States
- Network errors with retry mechanisms
- Model errors with specific messaging
- Validation errors with helpful suggestions
- System errors with fallback options
- User errors with constructive guidance

### Error Recovery
- Automatic retry with exponential backoff
- Fallback to alternative models
- Offline mode with local storage
- Error logging and reporting
- User-friendly error messages

## Implementation Instructions

### Step 1: Create Component Structure
1. Create a new React component file with TypeScript
2. Define component props interface with proper typing
3. Set up basic component skeleton with accessibility attributes
4. Implement proper ARIA labels and roles from the start

### Step 2: Implement Core Functionality
1. Add state management with React hooks
2. Implement event handlers with proper typing
3. Create helper functions for complex logic
4. Add error handling and loading states

### Step 3: Apply Styling and Animations
1. Apply Winter color palette using TailwindCSS classes
2. Implement responsive design with mobile-first approach
3. Add micro-interactions and smooth transitions
4. Ensure accessibility compliance throughout

### Step 4: Add Advanced Features
1. Implement real-time updates with WebSocket integration
2. Add virtual scrolling for performance optimization
3. Create progressive loading for large content
4. Implement keyboard navigation and shortcuts

### Step 5: Testing and Refinement
1. Test across all breakpoint sizes
2. Verify accessibility compliance with screen readers
3. Performance test with large datasets
4. Cross-browser compatibility testing

## Code Quality Standards

### TypeScript Configuration
- Strict mode enabled with no implicit any
- Explicit return types for all functions
- Proper interface definitions for all data structures
- Generic types for reusable components
- Proper error handling with custom error types

### Component Patterns
- Functional components with hooks (no class components)
- Proper prop destructuring with default values
- Memoization for performance optimization
- Custom hooks for reusable logic
- Proper cleanup in useEffect hooks

### Styling Standards
- TailwindCSS utility classes only (no custom CSS)
- Consistent spacing using design system scale
- Proper color contrast ratios
- Mobile-first responsive classes
- Dark mode support preparation

## Testing Requirements

### Accessibility Testing
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Keyboard navigation completeness
- Color contrast validation
- Focus management verification
- Text scaling up to 200% without horizontal scroll

### Cross-Platform Testing
- Chrome, Firefox, Safari, Edge support
- iOS and Android mobile devices
- Windows, macOS, and Linux desktop
- Touch interaction responsiveness
- Performance on low-end devices

### Performance Testing
- Initial load time under 2 seconds
- Interaction response under 100ms
- Smooth 60fps animations
- Memory usage under 200MB for typical usage
- Efficient rendering for large datasets

## Example Component Implementation

Here's a complete example of the MessageBubble component following all specifications:

```typescript
import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageBubbleProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  attachments?: Attachment[];
  artifacts?: Artifact[];
  status: 'sending' | 'sent' | 'error' | 'streaming';
  onRegenerate?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  id,
  role,
  content,
  timestamp,
  model,
  attachments = [],
  artifacts = [],
  status,
  onRegenerate,
  onCopy,
  onShare
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const getBubbleStyles = useCallback(() => {
    const baseStyles = 'relative max-w-4xl rounded-lg border p-4 transition-all duration-200';
    
    switch (role) {
      case 'user':
        return cn(
          baseStyles,
          'bg-sage-green text-charcoal-black border-slate-gray',
          'hover:bg-light-sage hover:shadow-md'
        );
      case 'assistant':
        return cn(
          baseStyles,
          'bg-off-white text-charcoal-black border-slate-gray',
          'hover:bg-gray-100 hover:shadow-md'
        );
      case 'system':
        return cn(
          baseStyles,
          'bg-slate-gray text-off-white border-charcoal-black',
          'hover:bg-gray-600'
        );
      default:
        return baseStyles;
    }
  }, [role]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        if (e.target === e.currentTarget) {
          setIsExpanded(!isExpanded);
        }
        break;
      case 'Escape':
        setIsExpanded(false);
        break;
    }
  }, [isExpanded]);

  return (
    <div
      role="article"
      aria-label={`${role} message`}
      className={cn('flex gap-3 p-2 rounded-lg transition-all duration-200', {
        'bg-charcoal-black bg-opacity-5': isHovered && role !== 'system'
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="flex-shrink-0">
        <AvatarFallback className="bg-sage-green text-charcoal-black">
          {role === 'user' ? 'U' : role === 'assistant' ? 'AI' : 'S'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-gray">
            {role === 'user' ? 'You' : role === 'assistant' ? 'AI Assistant' : 'System'}
          </span>
          {model && (
            <span className="text-xs text-muted-sage">
              {model}
            </span>
          )}
          <time className="text-xs text-muted-sage" dateTime={timestamp.toISOString()}>
            {timestamp.toLocaleTimeString()}
          </time>
        </div>
        
        <div
          tabIndex={0}
          role="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse message' : 'Expand message'}
          className={getBubbleStyles()}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={handleKeyDown}
        >
          {status === 'streaming' ? (
            <div className="flex items-center gap-2">
              <span className="animate-pulse">●</span>
              <span>AI is thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {isExpanded ? content : `${content.slice(0, 200)}...`}
            </div>
          )}
          
          {content.length > 200 && (
            <button
              className="text-xs text-slate-gray hover:text-charcoal-black mt-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              aria-label={isExpanded ? 'Show less' : 'Show more'}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        
        {isHovered && status === 'sent' && (
          <div className="flex gap-2 mt-2" role="toolbar" aria-label="Message actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCopy}
              aria-label="Copy message"
              className="text-slate-gray hover:text-charcoal-black"
            >
              Copy
            </Button>
            {role === 'assistant' && onRegenerate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRegenerate}
                aria-label="Regenerate response"
                className="text-slate-gray hover:text-charcoal-black"
              >
                Regenerate
              </Button>
            )}
            {onShare && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onShare}
                aria-label="Share message"
                className="text-slate-gray hover:text-charcoal-black"
              >
                Share
              </Button>
            )}
          </div>
        )}
        
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1" role="region" aria-label="Attachments">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 bg-charcoal-black bg-opacity-5 rounded"
              >
                <span className="text-sm text-slate-gray">{attachment.name}</span>
                <span className="text-xs text-muted-sage">({attachment.size})</span>
              </div>
            ))}
          </div>
        )}
        
        {artifacts.length > 0 && (
          <div className="mt-2 space-y-2" role="region" aria-label="Generated artifacts">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="p-2 border border-slate-gray rounded bg-off-white"
              >
                <h4 className="text-sm font-medium text-charcoal-black">
                  {artifact.name}
                </h4>
                <p className="text-xs text-slate-gray mt-1">
                  {artifact.type} • {artifact.size}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## Final Instructions

1. **Follow the structured framework**: Use the four-part framework (High-Level Goal, Detailed Instructions, Code Examples & Constraints, Strict Scope) for every component
2. **Prioritize accessibility**: Every component must be WCAG 2.1 AA compliant from the start
3. **Mobile-first design**: Always design for mobile first, then enhance for larger screens
4. **Performance optimization**: Use virtual scrolling, memoization, and lazy loading where appropriate
5. **Error handling**: Implement comprehensive error states and recovery mechanisms
6. **Testing**: Test across all devices, browsers, and accessibility tools
7. **Documentation**: Include JSDoc comments and usage examples

Remember: This prompt creates production-ready components that will be used by developers in real AI-powered project management workflows. Every detail matters for user experience and accessibility.
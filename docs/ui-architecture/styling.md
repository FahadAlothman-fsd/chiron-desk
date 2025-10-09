
Based on your Tailwind CSS + shadcn/ui stack, here's the comprehensive styling guidelines for your frontend architecture.

### Styling Approach

**Tailwind CSS Utility-First with shadcn/ui Components:**

Your styling approach leverages Tailwind CSS's utility-first methodology combined with shadcn/ui's pre-built, accessible components. This provides a perfect balance of rapid development and consistency.

**Core Principles:**
1. **Utility-First**: Use Tailwind utility classes directly in JSX for all custom styling
2. **Component Library**: Rely on shadcn/ui components for common UI patterns
3. **No Custom CSS**: Avoid creating separate CSS files; all styles are co-located with components
4. **Design Tokens**: Use CSS custom properties for theme consistency
5. **Responsive Design**: Mobile-first approach with Tailwind's responsive utilities

**Component Styling Pattern:**
```tsx
// Good: Utility classes in JSX
<div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">

// Avoid: Custom CSS classes
<div className="custom-component"> {/* Don't do this */}
```

**shadcn/ui Integration:**
- Use built-in variants: `variant="outline"`, `size="sm"`
- Customize components via `className` prop for one-off modifications
- Extend shadcn/ui components when needed for project-specific requirements

**Responsive Strategy:**
- Mobile-first: Design for mobile, enhance for larger screens
- Breakpoints: Use Tailwind's `sm:`, `md:`, `lg:`, `xl:` prefixes
- Container queries: Use `@container` for component-level responsive design

**Animation and Transitions:**
- Use Tailwind's transition utilities: `transition-colors duration-200`
- Leverage Framer Motion for complex animations
- Follow your Winter palette for motion design

### Global Theme Variables

Here's your CSS custom properties theme system implementing the Winter color palette with dark mode support:

```css
/* styles/globals.css - Global theme variables */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Winter Color Palette - Light Mode */
    --background: 42 44 41; /* #2A2C29 */
    --foreground: 167 165 151; /* #A7A599 */
    
    --card: 255 255 255;
    --card-foreground: 42 44 41;
    
    --popover: 255 255 255;
    --popover-foreground: 42 44 41;
    
    --primary: 93 108 106; /* #5D6C6A */
    --primary-foreground: 255 255 255;
    
    --secondary: 240 240 240;
    --secondary-foreground: 42 44 41;
    
    --muted: 245 245 245;
    --muted-foreground: 107 114 128;
    
    --accent: 240 240 240;
    --accent-foreground: 42 44 41;
    
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    
    --border: 229 229 229;
    --input: 229 229 229;
    --ring: 93 108 106;
    
    --radius: 0.5rem;
    
    /* Typography */
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    
    /* Spacing Scale */
    --space-1: 0.25rem; /* 4px */
    --space-2: 0.5rem;  /* 8px */
    --space-3: 0.75rem; /* 12px */
    --space-4: 1rem;    /* 16px */
    --space-5: 1.25rem; /* 20px */
    --space-6: 1.5rem;  /* 24px */
    --space-8: 2rem;    /* 32px */
    --space-10: 2.5rem; /* 40px */
    --space-12: 3rem;   /* 48px */
    --space-16: 4rem;   /* 64px */
    --space-20: 5rem;   /* 80px */
    --space-24: 6rem;   /* 96px */
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    
    /* Border Radius */
    --radius-sm: 0.125rem;
    --radius: 0.25rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-3xl: 1.5rem;
    
    /* Z-Index Scale */
    --z-dropdown: 1000;
    --z-sticky: 1020;
    --z-fixed: 1030;
    --z-modal-backdrop: 1040;
    --z-modal: 1050;
    --z-popover: 1060;
    --z-tooltip: 1070;
    --z-toast: 1080;
  }
  
  .dark {
    /* Winter Color Palette - Dark Mode */
    --background: 42 44 41; /* #2A2C29 - slightly darker for dark mode */
    --foreground: 167 165 151; /* #A7A599 */
    
    --card: 45 47 44; /* Slightly lighter than background */
    --card-foreground: 167 165 151;
    
    --popover: 45 47 44;
    --popover-foreground: 167 165 151;
    
    --primary: 93 108 106;
    --primary-foreground: 255 255 255;
    
    --secondary: 58 62 60;
    --secondary-foreground: 167 165 151;
    
    --muted: 58 62 60;
    --muted-foreground: 140 143 138;
    
    --accent: 58 62 60;
    --accent-foreground: 167 165 151;
    
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    
    --border: 58 62 60;
    --input: 58 62 60;
    --ring: 93 108 106;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply text-foreground;
  }
  
  code, pre {
    font-family: var(--font-mono);
  }
}

@layer components {
  /* Custom component classes using design tokens */
  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .btn-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .card {
    @apply bg-card text-card-foreground rounded-lg border shadow-sm;
  }
  
  .input {
    @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
  }
  
  /* Chat-specific components */
  .chat-message {
    @apply p-4 rounded-lg mb-4 max-w-3xl;
  }
  
  .chat-user {
    @apply chat-message bg-primary text-primary-foreground ml-auto;
  }
  
  .chat-assistant {
    @apply chat-message bg-muted;
  }
  
  /* Workflow components */
  .workflow-step {
    @apply flex items-center p-3 border border-border rounded-md bg-card;
  }
  
  .workflow-step-active {
    @apply workflow-step border-primary bg-primary/5;
  }
  
  .workflow-step-completed {
    @apply workflow-step bg-green-50 border-green-200;
  }
}

@layer utilities {
  /* Utility classes for common patterns */
  .text-balance {
    text-wrap: balance;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0; 
      transform: translateY(10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
}

/* Dark mode toggle styles */
.dark-mode-toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50;
}

.dark-mode-toggle[data-state="checked"] {
  @apply bg-primary;
}

.dark-mode-toggle[data-state="unchecked"] {
    @apply bg-secondary;
}
```

**Detailed Rationale:**
This styling approach provides:
- **Consistency**: CSS custom properties ensure the Winter palette is applied uniformly
- **Dark Mode**: Seamless light/dark mode switching with proper contrast
- **Accessibility**: WCAG-compliant color contrasts and focus states
- **Maintainability**: No custom CSS files, everything managed through Tailwind
- **Performance**: Tailwind's purging removes unused styles automatically
- **shadcn/ui Integration**: Built-in support for component variants and theming

Trade-offs include the initial setup complexity of CSS variables, but it ensures perfect theme consistency across your application. The utility-first approach speeds up development while maintaining design system integrity.


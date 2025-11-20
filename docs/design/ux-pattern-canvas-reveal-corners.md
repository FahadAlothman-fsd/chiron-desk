# UX Pattern: Canvas Reveal Effect with Plus Sign Corners

**Pattern Discovery Date:** 2025-11-09  
**Source:** [Aceternity UI - Canvas Reveal Effect](https://ui.aceternity.com/components/canvas-reveal-effect)  
**Category:** Card Enhancements / Corner Decorations / Hover Effects  
**Chiron Context:** Matches the `+` corner decorations in your workflow builder mockup

---

## What This Pattern Is

A sophisticated card hover effect that combines:
1. **Plus sign (`+`) corners** - Custom SVG icons at all four corners
2. **Animated canvas background** - Dot matrix effect that reveals on hover
3. **Content transitions** - Smooth opacity/transform animations

**Why you love this:**
- Creates tactical/technical aesthetic (like your mockup images)
- Plus signs indicate interactive/expandable areas
- Works perfectly with Chiron's agent signature colors
- Proven pattern from Aceternity + Clerk

---

## Installation

```bash
npx shadcn@latest add @aceternity/canvas-reveal-effect
```

This installs:
- `components/ui/canvas-reveal-effect.tsx` - Canvas component
- Dependencies: `motion` (Framer Motion)

---

## Complete Implementation Code

### The Icon Component (from Aceternity)

```tsx
// Custom SVG for plus sign corners
export const Icon = ({ className, ...rest }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};
```

### Full Card Component with Canvas Reveal

```tsx
"use client";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";

// Icon component (see above)
export const Icon = ({ className, ...rest }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};

const Card = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) => {
  const [hovered, setHovered] = React.useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border border-black/[0.2] group/canvas-card flex items-center justify-center dark:border-white/[0.2] max-w-sm w-full mx-auto p-4 relative h-[30rem]"
    >
      {/* Corner Plus Signs */}
      <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />

      {/* Canvas Reveal Effect on Hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full absolute inset-0"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Content */}
      <div className="relative z-20">
        <div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200">
          {icon}
        </div>
        <h2 className="dark:text-white text-xl opacity-0 group-hover/canvas-card:opacity-100 relative z-10 text-black mt-4 font-bold group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200">
          {title}
        </h2>
      </div>
    </div>
  );
};

// Usage
<Card title="PM Agent" icon={<PMIcon />}>
  <CanvasRevealEffect
    animationSpeed={3}
    containerClassName="bg-red-900"
    colors={[[254, 83, 68]]}  // PM red in RGB
  />
</Card>
```

---

## Chiron-Specific Usage

### Agent Cards with Signature Colors

```tsx
// PM Agent - Red corners + red canvas
<div className="relative border border-[#FE5344]/30 bg-black p-6 h-[300px]">
  <Icon className="absolute h-6 w-6 -top-3 -left-3 text-[#FE5344]" />
  <Icon className="absolute h-6 w-6 -top-3 -right-3 text-[#FE5344]" />
  <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-[#FE5344]" />
  <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-[#FE5344]" />
  
  {/* Content */}
</div>

// Analyst Agent - Green corners
<Icon className="..." text-[#3C4236]" />

// DEV Agent - Neon green corners  
<Icon className="..." text-[#C4FF58]" />

// UX Designer - Coral corners
<Icon className="..." text-[#F16D50]" />

// Architect - Blue-gray corners
<Icon className="..." text-[#5D6C6A]" />

// SM - Neutral corners
<Icon className="..." text-[#A6A77E]" />
```

### Status-Based Colors

```tsx
// Success/Active - Green
<Icon className="absolute h-6 w-6 -top-3 -left-3 text-[#22C55E]" />

// Error/Failed - Red
<Icon className="absolute h-6 w-6 -top-3 -left-3 text-[#EF4444]" />

// Warning/Paused - Yellow
<Icon className="absolute h-6 w-6 -top-3 -left-3 text-[#F59E0B]" />

// Info/Idle - Blue
<Icon className="absolute h-6 w-6 -top-3 -left-3 text-[#3B82F6]" />
```

### Canvas Background Colors (RGB Format)

```tsx
// Agent colors in RGB for CanvasRevealEffect
const AGENT_COLORS_RGB = {
  analyst: [60, 66, 54],      // #3C4236
  pm: [254, 83, 68],          // #FE5344
  architect: [93, 108, 106],  // #5D6C6A
  dev: [196, 255, 88],        // #C4FF58
  sm: [166, 167, 126],        // #A6A77E
  ux: [241, 109, 80],         // #F16D50
};

<CanvasRevealEffect
  animationSpeed={3}
  colors={[AGENT_COLORS_RGB.pm]}
  containerClassName="bg-red-900"
/>
```

---

## Component Props Reference

### CanvasRevealEffect

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationSpeed` | `number` | `0.4` | Animation speed (0.1 = slower, 1.0 = faster) |
| `colors` | `number[][]` | `[[0, 255, 255]]` | RGB color arrays (e.g., `[[254, 83, 68]]` for PM red) |
| `containerClassName` | `string` | - | Tailwind classes for container background |
| `dotSize` | `number` | - | Size of dots in the effect |
| `showGradient` | `boolean` | `true` | Whether to show gradient overlay |

### Icon (Custom SVG)

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Tailwind classes for size, position, color |
| `strokeWidth` | `number` | Stroke thickness (default 1.5 from SVG) |
| `...rest` | `any` | Standard SVG props |

---

## Use Cases in Chiron

### 1. Agent Status Cards
```tsx
<Card title="PM Agent - Active" icon={<PMIcon />}>
  <CanvasRevealEffect colors={[[254, 83, 68]]} />
</Card>
```

### 2. Story Cards in Kanban
```tsx
<Card title="Story #123: Auth" icon={<CheckIcon />}>
  <CanvasRevealEffect colors={[[34, 197, 94]]} /> // Green for done
</Card>
```

### 3. Workflow Phase Cards
```tsx
<Card title="Analysis Phase" icon={<MagnifyIcon />}>
  <CanvasRevealEffect colors={[[59, 130, 246]]} /> // Blue
</Card>
```

### 4. Mission Cards (from your mockup)
```tsx
<Card title="Mission: Omega3" icon={<TargetIcon />}>
  <CanvasRevealEffect colors={[[239, 68, 68]]} /> // Red for high priority
</Card>
```

---

## Design Guidelines

### When to Use This Pattern

✅ **Use for:**
- Agent cards with hover interactions
- Story/task cards in Kanban views
- Workflow nodes that expand on hover
- Mission cards with status indicators
- Any card that reveals more info on hover

❌ **Don't use for:**
- Static text content
- Buttons (too heavy)
- Small UI elements
- Forms or inputs
- Frequently hovered elements (animation fatigue)

### Size Guidelines

| Context | Icon Size | Position Offset |
|---------|-----------|-----------------|
| **Standard cards** | `h-6 w-6` (24px) | `-top-3 -left-3` (-12px) |
| **Large cards** | `h-8 w-8` (32px) | `-top-4 -left-4` (-16px) |
| **Compact cards** | `h-4 w-4` (16px) | `-top-2 -left-2` (-8px) |

### Color Strategy

1. **Agent cards** → Use agent signature color
2. **Status indicators** → Use semantic status color (green/red/yellow)
3. **Neutral cards** → Use white or gray
4. **Hover emphasis** → Add glow effect: `drop-shadow-[0_0_8px_currentColor]`

---

## Accessibility

### Screen Reader Support
```tsx
<Icon 
  className="..." 
  aria-hidden="true"  // Decorative only
/>
```

### Keyboard Navigation
Ensure cards with this pattern are keyboard accessible:
```tsx
<div 
  tabIndex={0}
  onFocus={() => setHovered(true)}
  onBlur={() => setHovered(false)}
  className="..."
>
  {/* Plus corners + canvas */}
</div>
```

### Reduced Motion
Respect user preferences:
```tsx
<AnimatePresence>
  {hovered && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
      className="motion-reduce:transition-none"
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Performance Considerations

- **Canvas rendering** uses GPU - test on low-end devices
- **Limit concurrent animations** - don't hover 10 cards simultaneously
- **Lazy load** canvas effects for off-screen cards
- **Reduce `animationSpeed`** if frame rate drops

---

## Alternative: Plus Corners Without Canvas

If canvas effect is too heavy, use just the plus corners:

```tsx
export const SimpleCard = ({ children, cornerColor = "white" }) => {
  return (
    <div className="relative border border-white/20 bg-black p-6">
      {/* Just the corners, no canvas */}
      <Icon className={`absolute h-6 w-6 -top-3 -left-3 text-[${cornerColor}]`} />
      <Icon className={`absolute h-6 w-6 -top-3 -right-3 text-[${cornerColor}]`} />
      <Icon className={`absolute h-6 w-6 -bottom-3 -left-3 text-[${cornerColor}]`} />
      <Icon className={`absolute h-6 w-6 -bottom-3 -right-3 text-[${cornerColor}]`} />
      
      {children}
    </div>
  );
};
```

---

## Visual Reference

**Live Demo:** https://ui.aceternity.com/components/canvas-reveal-effect  
**Your Mockup:** Workflow Builder UI (Image 2) - see `+` at viewport corners

---

## Related Patterns

- **Pattern #4: Corner Border Treatments** (UX Design Specification Section 2.2)
- **Agent Signature Colors** (UX Design Specification Section 3.1)
- **Semantic Status Colors** (UX Design Specification Section 3.1)

---

## Next Steps

1. ✅ Install component: `npx shadcn@latest add @aceternity/canvas-reveal-effect`
2. ✅ Copy `Icon` component into your codebase
3. ✅ Create `ChironCard` wrapper with agent color support
4. ✅ Test with PM Agent card (red corners + red canvas)
5. ✅ Apply to other agent cards
6. ✅ Add to Storybook with all color variants
7. ✅ Test accessibility (keyboard nav, screen readers)

---

_Pattern documented: 2025-11-09 | Single comprehensive file_

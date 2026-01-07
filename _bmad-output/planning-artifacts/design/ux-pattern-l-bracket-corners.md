# UX Pattern: L-Bracket Corners & Battery Stepper

**Pattern Discovery Date:** 2025-11-09  
**Source:** Your v0 mockup (Schedule & Monitoring Regions)  
**Category:** Corner Decorations / Stepper Components  
**Chiron Context:** Workflow wizard steps (Story 1.4) and agent icons

---

## What This Pattern Is

Two related visual patterns that create a technical/tactical aesthetic:

1. **L-Bracket Corners** - Small L-shaped corner markers on icons/cards
2. **Battery-Style Stepper** - Horizontal rectangles showing progress (like a battery indicator)

**Why this works:**
- L-brackets create "targeting reticle" feel (matches your mockups)
- Battery stepper is visually simple and clear
- Works perfectly for wizard workflows (workflow-init in Story 1.4)
- Scalable for different workflow types

---

## Visual Reference from Your Mockup

**What I see in your images:**
- Top header: "3 Schedule & Regions" with battery stepper (2 gray bars on left, blue "3" in center, 2 gray bars on right)
- Icon with L-bracket: Globe icon has corner bracket at top-left
- Card structure: Icon centered at top, title, description, form fields below
- Clean dark theme with blue accents

---

## L-Bracket Corner Component

### SVG Component (Custom, like Plus Icon)

```tsx
type CornerPosition = 'tl' | 'tr' | 'bl' | 'br';

interface LBracketProps {
  position: CornerPosition;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export const LBracket = ({ 
  position = 'tl',
  size = 16,
  strokeWidth = 2,
  color = 'currentColor',
  className = ''
}: LBracketProps) => {
  // Different rotations for each corner
  const rotations: Record<CornerPosition, number> = {
    tl: 0,    // Default orientation: └ rotated to ┌
    tr: 90,   // Rotate 90deg CW: ┐
    bl: -90,  // Rotate 90deg CCW: └
    br: 180   // Rotate 180deg: ┘
  };
  
  // Position classes
  const positions: Record<CornerPosition, string> = {
    tl: '-top-1 -left-1',
    tr: '-top-1 -right-1',
    bl: '-bottom-1 -left-1',
    br: '-bottom-1 -right-1'
  };
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={`absolute ${positions[position]} ${className}`}
      style={{ transform: `rotate(${rotations[position]}deg)` }}
    >
      {/* L-shaped path: vertical line from top to bottom, then horizontal to right */}
      <path d="M 4 4 L 4 20 M 4 20 L 20 20" />
    </svg>
  );
};

// Convenience component for all 4 corners
export const LBracketCorners = ({ 
  size = 16, 
  strokeWidth = 2, 
  color = 'currentColor',
  className = ''
}: Omit<LBracketProps, 'position'>) => {
  return (
    <>
      <LBracket position="tl" size={size} strokeWidth={strokeWidth} color={color} className={className} />
      <LBracket position="tr" size={size} strokeWidth={strokeWidth} color={color} className={className} />
      <LBracket position="bl" size={size} strokeWidth={strokeWidth} color={color} className={className} />
      <LBracket position="br" size={size} strokeWidth={strokeWidth} color={color} className={className} />
    </>
  );
};
```

### Usage Examples

#### Icon with Single Corner Bracket (Like Your Mockup)

```tsx
// Just top-left corner like in your image
<div className="relative w-12 h-12 flex items-center justify-center bg-blue-500/10 rounded">
  <LBracket position="tl" size={12} strokeWidth={2} color="#3B82F6" />
  <GlobeIcon className="w-6 h-6 text-blue-500" />
</div>
```

#### Card with All Four Corners

```tsx
<div className="relative border border-white/20 bg-black p-6">
  <LBracketCorners size={16} strokeWidth={2} color="white" />
  
  {/* Content */}
  <h3 className="text-white">Schedule & Monitoring Regions</h3>
  <p className="text-gray-400">Set how often your monitor runs...</p>
</div>
```

#### Agent Icon with Color-Coded Corner

```tsx
// PM Agent with red corner bracket
<div className="relative w-16 h-16 flex items-center justify-center border border-[#FE5344]/30 bg-black">
  <LBracket position="tl" size={14} strokeWidth={2.5} color="#FE5344" />
  <PMIcon className="w-8 h-8" />
</div>
```

---

## Battery-Style Stepper Component

### Component Implementation

```tsx
interface BatteryStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  variant?: 'compact' | 'labeled';
  activeColor?: string;
  inactiveColor?: string;
}

export const BatteryStepper = ({
  currentStep,
  totalSteps,
  stepLabel,
  variant = 'compact',
  activeColor = '#3B82F6', // Blue
  inactiveColor = '#374151', // Gray-700
}: BatteryStepperProps) => {
  return (
    <div className="flex items-center gap-2">
      {/* Left inactive bars */}
      <div className="flex gap-0.5">
        {Array.from({ length: currentStep - 1 }).map((_, i) => (
          <div
            key={`prev-${i}`}
            className="w-6 h-8 rounded-sm"
            style={{ backgroundColor: inactiveColor }}
          />
        ))}
      </div>
      
      {/* Current step (highlighted) */}
      <div 
        className="flex items-center justify-center min-w-[32px] h-8 rounded-sm font-mono text-sm font-bold"
        style={{ backgroundColor: activeColor, color: 'white' }}
      >
        {currentStep}
      </div>
      
      {/* Step label */}
      {variant === 'labeled' && stepLabel && (
        <span className="text-white font-medium ml-2">{stepLabel}</span>
      )}
      
      {/* Right inactive bars */}
      <div className="flex gap-0.5">
        {Array.from({ length: totalSteps - currentStep }).map((_, i) => (
          <div
            key={`next-${i}`}
            className="w-6 h-8 rounded-sm"
            style={{ backgroundColor: inactiveColor }}
          />
        ))}
      </div>
    </div>
  );
};
```

### Usage Examples

#### Wizard Stepper (Like Your Mockup)

```tsx
// At top of workflow card
<div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
  <BatteryStepper 
    currentStep={3} 
    totalSteps={5} 
    stepLabel="Schedule & Regions"
    variant="labeled"
  />
  
  {/* Optional pause button */}
  <button className="p-2 text-gray-400 hover:text-white">
    <PauseIcon className="w-5 h-5" />
  </button>
</div>
```

#### Compact Progress Indicator

```tsx
// For smaller contexts (agent cards, status indicators)
<BatteryStepper 
  currentStep={2} 
  totalSteps={4} 
  variant="compact"
/>
```

#### With Agent Colors

```tsx
// PM Agent workflow with red active step
<BatteryStepper 
  currentStep={3} 
  totalSteps={6} 
  stepLabel="PRD Generation"
  activeColor="#FE5344" // PM red
  inactiveColor="#1F2937"
/>
```

---

## Complete Workflow Card (Matching Your Mockup)

```tsx
import { LBracket } from '@/components/ui/l-bracket';
import { BatteryStepper } from '@/components/ui/battery-stepper';

interface WorkflowStepCardProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
}

export const WorkflowStepCard = ({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  icon,
  children,
  onBack,
  onContinue
}: WorkflowStepCardProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden">
      {/* Header with stepper */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <BatteryStepper 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
          stepLabel={stepTitle}
          variant="labeled"
        />
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      
      {/* Icon with L-bracket corner */}
      <div className="flex justify-center pt-8 pb-6">
        <div className="relative w-16 h-16 flex items-center justify-center bg-blue-500/10 rounded-lg">
          <LBracket position="tl" size={12} strokeWidth={2} color="#3B82F6" />
          {icon}
        </div>
      </div>
      
      {/* Title and description */}
      <div className="text-center px-6 pb-6">
        <h2 className="text-xl font-semibold text-white mb-2">{stepTitle}</h2>
        <p className="text-gray-400 text-sm">{stepDescription}</p>
      </div>
      
      {/* Form content */}
      <div className="px-6 pb-6">
        {children}
      </div>
      
      {/* Footer with navigation */}
      <div className="flex gap-3 px-6 pb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="flex-1 py-3 bg-transparent border border-white/20 text-white rounded hover:bg-white/5 transition-colors"
          >
            ← Back
          </button>
        )}
        {onContinue && (
          <button 
            onClick={onContinue}
            className="flex-1 py-3 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

// Usage
<WorkflowStepCard
  currentStep={3}
  totalSteps={5}
  stepTitle="Schedule & Monitoring Regions"
  stepDescription="Set how often your monitor runs and select global regions to check your endpoint from."
  icon={<GlobeIcon className="w-8 h-8 text-blue-500" />}
  onBack={() => console.log('Back')}
  onContinue={() => console.log('Continue')}
>
  {/* Your form fields here */}
  <div className="space-y-4">
    {/* Frequency dropdown, regions selector, etc. */}
  </div>
</WorkflowStepCard>
```

---

## Stepper Variants for Different Workflows

Based on your workflow table:

### 1. Wizard Stepper (workflow-init, Story creation)

```tsx
<BatteryStepper 
  currentStep={3} 
  totalSteps={5} 
  stepLabel="Project Setup"
  variant="labeled"
  activeColor="#3B82F6"
/>
```

**Use for:** Linear workflows where user goes step-by-step
- workflow-init (Story 1.4) ✅
- Story creation

### 2. Workbench Stepper (PRD, Architecture, Epic breakdown)

```tsx
// Larger stepper with more steps
<BatteryStepper 
  currentStep={5} 
  totalSteps={12} 
  stepLabel="Requirements Gathering"
  variant="labeled"
  activeColor="#F59E0B" // Yellow for in-progress work
/>
```

**Use for:** Complex workflows with many substeps
- PRD creation
- Architecture design
- Epic breakdown

### 3. Progress Stepper (Code generation)

```tsx
// Compact with status color
<BatteryStepper 
  currentStep={8} 
  totalSteps={10} 
  variant="compact"
  activeColor="#22C55E" // Green for active execution
/>
```

**Use for:** Automated workflows showing progress
- Code generation
- Running tests
- Deployment

### 4. Kanban Stepper (Sprint planning)

```tsx
// Minimal stepper showing phase
<BatteryStepper 
  currentStep={2} 
  totalSteps={4} 
  stepLabel="In Progress"
  variant="labeled"
  activeColor="#A6A77E" // SM neutral color
/>
```

**Use for:** Column-based workflows
- Sprint planning
- Task tracking

---

## Design Guidelines

### L-Bracket Corners

**When to use:**
✅ Icons in wizard cards (like your mockup)  
✅ Agent avatars/icons  
✅ Special UI elements that need emphasis  
✅ Targeting/selection indicators

**Size guidelines:**
- **Small icons (24-32px):** `size={10}` strokeWidth={1.5}
- **Medium icons (48-64px):** `size={12}` strokeWidth={2}
- **Large cards:** `size={16}` strokeWidth={2.5}

**Color strategy:**
- **Agent icons:** Use agent signature color
- **Status icons:** Use semantic status color
- **Neutral:** Use white or blue accent

### Battery Stepper

**When to use:**
✅ Multi-step wizards (3-10 steps)  
✅ Progress tracking for workflows  
✅ Phase indicators

**Configuration by workflow:**
| Workflow Type | Total Steps | Active Color | Variant |
|---------------|-------------|--------------|---------|
| **Wizard** | 3-7 | Blue (#3B82F6) | labeled |
| **Workbench** | 8-15 | Yellow (#F59E0B) | labeled |
| **Progress** | Any | Green (#22C55E) | compact |
| **Kanban** | 3-5 | Neutral (#A6A77E) | labeled |

---

## Accessibility

### L-Bracket Corners
```tsx
<LBracket 
  position="tl" 
  size={12} 
  color="#3B82F6"
  aria-hidden="true" // Decorative only
/>
```

### Battery Stepper
```tsx
<div role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={5}>
  <BatteryStepper currentStep={3} totalSteps={5} />
</div>
```

---

## Next Steps for Story 1.4

1. ✅ Create `LBracket` component in `components/ui/l-bracket.tsx`
2. ✅ Create `BatteryStepper` component in `components/ui/battery-stepper.tsx`
3. ✅ Create `WorkflowStepCard` wrapper component
4. ✅ Implement in workflow-init wizard
5. ✅ Test with different step counts (3, 5, 7 steps)
6. ✅ Add to Storybook with all variants
7. ✅ Document usage patterns for other workflows

---

## File Structure

```
components/
  ui/
    l-bracket.tsx           # L-bracket corner component
    battery-stepper.tsx     # Battery-style stepper
    workflow-step-card.tsx  # Complete card wrapper
```

---

_Pattern documented: 2025-11-09 | Ready for Story 1.4 implementation_

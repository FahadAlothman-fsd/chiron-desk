# Workflow Initializer Selector - Wireframe

**Page:** `/projects/{projectId}/select-initializer`  
**Purpose:** Allow user to select workflow initializer approach for new project  
**Story:** 1.5 - Workflow-Init Steps 1-2 Foundation  
**Date:** 2025-11-09

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Chiron                                            [User Avatar ▼]  [⚙️]   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                                                                            │
│    ← Back to Projects                                                     │
│                                                                            │
│    Choose Your Setup Approach                                             │
│    Select how you'd like to set up your project.                          │
│                                                                            │
│    ┌──────────────────────────────────────────────────────────────┐      │
│    │  ┌─────────────────────────────────────────────────────┐     │      │
│    │  │                                                       │     │      │
│    │  │                    🔄                                │     │      │
│    │  │                                                       │     │      │
│    │  │              Guided Setup                            │     │      │
│    │  │                                                       │     │      │
│    │  │   Conversational setup for new projects (15-20 min)  │     │      │
│    │  │                                                       │     │      │
│    │  │   • LLM-guided project description                   │     │      │
│    │  │   • Intelligent complexity analysis                  │     │      │
│    │  │   • Personalized workflow path selection             │     │      │
│    │  │   • AI-assisted project naming                       │     │      │
│    │  │                                                       │     │      │
│    │  │                       ●                               │     │      │
│    │  │                                                       │     │      │
│    │  └─────────────────────────────────────────────────────┘     │      │
│    │                                                                │      │
│    │  This is currently the only setup option available.           │      │
│    │                                                                │      │
│    └──────────────────────────────────────────────────────────────┘      │
│                                                                            │
│                                                  [Continue →]              │
│                                                                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### **Header Section**

```
┌────────────────────────────────────────────────────────────────┐
│  Chiron                                [User Avatar ▼]  [⚙️]   │
└────────────────────────────────────────────────────────────────┘
```

**Elements:**
- Logo/Brand: "Chiron" (top-left)
- User avatar dropdown (top-right)
- Settings icon (top-right)

---

### **Navigation Breadcrumb**

```
← Back to Projects
```

**Elements:**
- Back arrow icon
- Link text: "Back to Projects"
- On click: Navigate to `/projects` or home page

---

### **Page Title & Description**

```
Choose Your Setup Approach
Select how you'd like to set up your project.
```

**Styling:**
- Title: Large, bold font (text-2xl font-bold)
- Description: Muted color (text-muted-foreground)
- Spacing: 8px gap between title and description

---

### **Card Container (RadioGroup13)**

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐     │
│  │                                                       │     │
│  │                    🔄                                │     │
│  │                                                       │     │
│  │              Guided Setup                            │     │
│  │                                                       │     │
│  │   Conversational setup for new projects (15-20 min)  │     │
│  │                                                       │     │
│  │   • LLM-guided project description                   │     │
│  │   • Intelligent complexity analysis                  │     │
│  │   • Personalized workflow path selection             │     │
│  │   • AI-assisted project naming                       │     │
│  │                                                       │     │
│  │                       ●                               │     │
│  │                                                       │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                │
│  This is currently the only setup option available.           │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Container:** Card with border, padding
- **Single Card (RadioGroup13.Card):**
  - Icon: 🔄 Workflow icon (centered, top)
  - Title: "Guided Setup" (centered, bold)
  - Subtitle: "Conversational setup..." (centered, muted)
  - Feature list: Bullet points (left-aligned)
  - Radio indicator: ● (centered, bottom)
  - State: Selected (border highlighted, radio filled)

**Helper Text:**
- Small text below card: "This is currently the only setup option available."
- Color: Muted (text-sm text-muted-foreground)

---

### **Continue Button**

```
[Continue →]
```

**Styling:**
- Position: Bottom-right of page
- Size: Default button size
- Variant: Primary (filled background)
- Icon: Right arrow (→)
- State: Enabled (card is auto-selected)

---

## Detailed Card Specification

### **Single Card (Story 1.5 - Only One Option)**

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│                        🔄                            │  ← Icon (48px)
│                                                       │
│                  Guided Setup                        │  ← Title (text-lg font-semibold)
│                                                       │
│     Conversational setup for new projects            │  ← Subtitle (text-sm text-muted-foreground)
│                   (15-20 min)                        │
│                                                       │
│     • LLM-guided project description                 │  ← Feature 1
│     • Intelligent complexity analysis                │  ← Feature 2
│     • Personalized workflow path selection           │  ← Feature 3
│     • AI-assisted project naming                     │  ← Feature 4
│                                                       │
│                         ●                            │  ← Radio indicator (selected)
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Dimensions:**
- Width: 100% (max-w-md, ~448px)
- Height: Auto (min-h-64, ~256px)
- Padding: p-6 (24px all sides)
- Border radius: rounded-lg (8px)

**States:**
- **Default:** Border: border-muted, Background: transparent
- **Hover:** Border: border-primary (slight highlight), Cursor: pointer
- **Selected:** Border: border-primary (2px, highlighted), Background: bg-primary/5 (subtle tint)

---

## Future State: Multiple Cards (Story 1.6+)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │                    │  │                    │  │                    │ │
│  │        ⚡          │  │        🔄          │  │        📋          │ │
│  │                    │  │                    │  │                    │ │
│  │   Quick Setup      │  │   Guided Setup     │  │  From Template     │ │
│  │                    │  │                    │  │                    │ │
│  │   Fast start       │  │   Conversational   │  │   Clone existing   │ │
│  │   (5 min)          │  │   (15-20 min)      │  │   (2 min)          │ │
│  │                    │  │                    │  │                    │ │
│  │   • Minimal Qs     │  │   • LLM-guided     │  │   • Pre-config     │ │
│  │   • Default path   │  │   • Analysis       │  │   • Customize      │ │
│  │                    │  │                    │  │                    │ │
│  │         ○          │  │         ●          │  │         ○          │ │
│  │                    │  │                    │  │                    │ │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Grid Layout:**
- 3 columns on desktop (min-w-240px per card)
- 2 columns on tablet (768px breakpoint)
- 1 column on mobile (640px breakpoint)
- Gap: gap-4 (16px between cards)

---

## Color Palette

### **Default State:**
```
Card Border:      hsl(var(--border))         // Muted border
Card Background:  transparent
Title:            hsl(var(--foreground))      // Primary text
Subtitle:         hsl(var(--muted-foreground)) // Muted text
Features:         hsl(var(--foreground))      // Primary text
Radio:            hsl(var(--muted-foreground)) // Empty radio
```

### **Selected State:**
```
Card Border:      hsl(var(--primary))         // Primary color (2px)
Card Background:  hsl(var(--primary) / 0.05)  // Subtle primary tint
Radio:            hsl(var(--primary))         // Filled radio
```

### **Hover State (Unselected):**
```
Card Border:      hsl(var(--primary) / 0.5)   // Semi-transparent primary
```

---

## Typography

### **Page Title:**
```
Font Size:   text-2xl (24px)
Font Weight: font-bold (700)
Color:       foreground
Line Height: leading-tight
```

### **Page Description:**
```
Font Size:   text-base (16px)
Font Weight: font-normal (400)
Color:       muted-foreground
Line Height: leading-relaxed
```

### **Card Title:**
```
Font Size:   text-lg (18px)
Font Weight: font-semibold (600)
Color:       foreground
Line Height: leading-tight
```

### **Card Subtitle:**
```
Font Size:   text-sm (14px)
Font Weight: font-normal (400)
Color:       muted-foreground
Line Height: leading-normal
```

### **Feature List:**
```
Font Size:   text-sm (14px)
Font Weight: font-normal (400)
Color:       foreground
Line Height: leading-relaxed
Bullet:      • (U+2022 BULLET)
Indent:      pl-4 (16px from left)
```

---

## Spacing & Layout

### **Page Container:**
```
Max Width:    max-w-4xl (896px)
Padding:      px-8 py-12 (32px horizontal, 48px vertical)
Margin:       mx-auto (centered)
```

### **Section Spacing:**
```
Breadcrumb → Title:       mb-8 (32px)
Title → Description:      mb-2 (8px)
Description → Cards:      mb-8 (32px)
Cards → Helper Text:      mt-4 (16px)
Helper Text → Button:     mt-6 (24px)
```

### **Card Internal Spacing:**
```
Icon → Title:             mt-4 (16px)
Title → Subtitle:         mt-2 (8px)
Subtitle → Features:      mt-4 (16px)
Features → Radio:         mt-6 (24px)
Feature Items:            space-y-2 (8px vertical gap)
```

---

## Interactions & Behavior

### **Card Click:**
```
Action:   Select card (set radio to filled)
Visual:   Border highlights, background tints
Duration: 150ms ease-in-out transition
```

### **Continue Button:**
```
Enabled:  Card is selected (default in Story 1.5 - auto-selected)
Disabled: No card selected (future state with multiple cards)
Action:   Navigate to /projects/{id}/initialize
Loading:  Show spinner + "Loading..." text
```

### **Auto-Select (Story 1.5):**
```
Condition: Only one initializer available
Behavior:  Card pre-selected on page load
Visual:    Selected state (highlighted border, filled radio)
```

---

## Responsive Breakpoints

### **Desktop (1024px+):**
```
Card Width:     max-w-md (448px)
Columns:        1 card (Story 1.5), 3 cards (future)
Container:      max-w-4xl (896px)
```

### **Tablet (768px - 1023px):**
```
Card Width:     100%
Columns:        1 card (Story 1.5), 2 cards (future)
Container:      max-w-2xl (672px)
Padding:        px-6 (24px)
```

### **Mobile (< 768px):**
```
Card Width:     100%
Columns:        1 card
Container:      max-w-full
Padding:        px-4 (16px)
Title Size:     text-xl (20px)
Icon Size:      36px (reduced from 48px)
```

---

## Accessibility

### **Keyboard Navigation:**
```
Tab:           Focus card (outline-primary ring-2)
Space/Enter:   Select focused card
Arrow Keys:    Navigate between cards (future multi-card)
```

### **Screen Reader:**
```
Card:          role="radio" aria-checked="true/false"
Container:     role="radiogroup" aria-label="Workflow initializer options"
Title:         Announced first (h2 heading)
Description:   Announced second (p)
Features:      Announced as list (ul > li)
Helper Text:   aria-live="polite" (announces changes)
```

### **Focus States:**
```
Card Focus:    outline-primary ring-2 ring-offset-2
Button Focus:  outline-primary ring-2 ring-offset-2
```

---

## Implementation Notes

### **shadcn RadioGroup13 Component:**

```tsx
import { RadioGroup13 } from "@/components/ui/radio-group-13";

<RadioGroup13
  defaultValue={singleInitializer?.id} // Auto-select if only one
  onValueChange={(value) => setSelectedId(value)}
>
  {initializers.map((init) => (
    <RadioGroup13.Card
      key={init.id}
      value={init.id}
      icon={<Workflow className="h-12 w-12" />}
      title={init.displayName}
      description={init.description}
    >
      {/* Feature list */}
      <ul className="mt-4 space-y-2 text-sm">
        {init.features.map((feature, i) => (
          <li key={i}>• {feature}</li>
        ))}
      </ul>
    </RadioGroup13.Card>
  ))}
</RadioGroup13>
```

### **Data Structure:**

```typescript
interface WorkflowInitializer {
  id: string;
  name: string; // "workflow-init-new-guided"
  displayName: string; // "Guided Setup"
  description: string; // "Conversational setup for new projects (15-20 min)"
  features: string[]; // ["LLM-guided project description", ...]
  initializerType: "new-project" | "existing-project";
}
```

---

## Visual Design Reference

**Inspiration:** Card-based selection UI similar to:
- Stripe pricing cards
- Vercel deployment options
- Linear workspace creation
- GitHub repository visibility selector

**Key Principles:**
- Clean, uncluttered layout
- Clear visual hierarchy (icon → title → description → features)
- Obvious selected state (border + background tint)
- Scannable feature lists (bullet points)
- Centered radio indicator for balance

---

## Edge Cases

### **No Initializers Found:**
```
┌────────────────────────────────────────────────────┐
│                                                     │
│                     ⚠️                              │
│                                                     │
│           No Setup Options Available                │
│                                                     │
│   No workflow initializers found for new projects.  │
│   Please contact support or try again later.       │
│                                                     │
│                [Back to Projects]                   │
│                                                     │
└────────────────────────────────────────────────────┘
```

### **Loading State:**
```
┌────────────────────────────────────────────────────┐
│                                                     │
│                     ⟳                               │
│                                                     │
│              Loading setup options...               │
│                                                     │
└────────────────────────────────────────────────────┘
```

### **Error State:**
```
┌────────────────────────────────────────────────────┐
│                                                     │
│                     ❌                              │
│                                                     │
│           Failed to Load Setup Options              │
│                                                     │
│   Could not load workflow initializers.             │
│   Please check your connection and try again.      │
│                                                     │
│                    [Retry]                          │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Animation & Transitions

### **Page Load:**
```css
.card-container {
  animation: fadeIn 300ms ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### **Card Selection:**
```css
.card {
  transition: all 150ms ease-in-out;
}

.card.selected {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.05);
}
```

### **Button State:**
```css
.continue-button {
  transition: all 150ms ease-in-out;
}

.continue-button:hover {
  transform: translateX(2px);
}
```

---

## Component File Structure

```
apps/web/src/
  routes/
    projects/
      [projectId]/
        select-initializer.tsx         # Main page component
  components/
    ui/
      radio-group-13.tsx                # shadcn component
    workflows/
      initializer-card.tsx              # Custom card wrapper (optional)
```

---

**Wireframe Created:** 2025-11-09  
**Story:** 1.5 - Workflow-Init Steps 1-2 Foundation  
**Status:** Ready for implementation

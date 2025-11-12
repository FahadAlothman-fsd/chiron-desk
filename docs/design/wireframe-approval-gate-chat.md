# Wireframes: Approval-Gate Chat (Story 1.6)

**Date:** 2025-11-10  
**Story:** 1.6 - Workflow Init Steps 4-6 (Complexity Analysis)  
**Pattern:** Chat Interface with Tool-Triggered Approval Modals  
**Created By:** Winston (Architect) + Mary (Analyst)

---

## 🎯 User Experience Flow

```
Step 1: Initial Chat          → User describes project
Step 2: Conversation          → PM Agent asks clarifying questions
Step 3: Summary Approval      → Agent proposes summary → User approves/rejects
Step 4: Continue Chat         → Agent gathers more details
Step 5: Complexity Approval   → Agent proposes complexity → User approves/rejects
Step 6: Complete             → All approvals done → Advance to next step
```

---

## 📱 Wireframe 1: Initial Chat State

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                                  │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Hi! I'm here to help you describe your        │    │    │
│  │  │ project. Tell me what you'd like to build.    │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Type your message...                              [📎] │    │
│  │                                                     [→] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  💡 Tip: Describe your project idea, key features, and goals    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Initial conversation start  
**User Action:** Type first message about their project

---

## 📱 Wireframe 2: Active Conversation

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                                  │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Hi! I'm here to help you describe your        │    │    │
│  │  │ project. Tell me what you'd like to build.    │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  👤 You:                                                │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ I want to build a healthcare records system   │    │    │
│  │  │ with HIPAA compliance                          │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Great! A HIPAA-compliant healthcare system.   │    │    │
│  │  │ Can you tell me more about:                    │    │    │
│  │  │ • Will it be multi-tenant or single-tenant?   │    │    │
│  │  │ • What types of records will it manage?       │    │    │
│  │  │ • Any specific integrations needed?           │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  👤 You:                                                │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Multi-tenant with role-based access control.  │    │    │
│  │  │ Needs audit logging and HL7 integration        │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  🤖 PM Agent: [Typing...]                              │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Type your message...                              [📎] │    │
│  │                                                     [→] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Multi-turn conversation in progress  
**Agent Behavior:** Asks clarifying questions, gathers details  
**User Action:** Provides more project details

---

## 📱 Wireframe 3: Summary Approval Modal (Tool Triggered)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                         [PAUSED] │    │
│  │                                                          │    │
│  │  [... previous conversation ...]                        │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Based on our conversation, I understand your  │    │    │
│  │  │ project. Let me propose a summary:            │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│        ┌──────────────────────────────────────────────┐          │
│        │  ╔════════════════════════════════════════╗ │          │
│        │  ║  📝 Approve Project Summary            ║ │          │
│        │  ╚════════════════════════════════════════╝ │          │
│        │                                              │          │
│        │  The agent has generated a project summary: │          │
│        │                                              │          │
│        │  ┌────────────────────────────────────────┐ │          │
│        │  │                                        │ │          │
│        │  │  HIPAA-compliant multi-tenant         │ │          │
│        │  │  healthcare records system with RBAC, │ │          │
│        │  │  audit logging, and HL7 integration   │ │          │
│        │  │                                        │ │          │
│        │  └────────────────────────────────────────┘ │          │
│        │                                              │          │
│        │  Feedback (optional - helps AI learn!) 💡   │          │
│        │  ┌────────────────────────────────────────┐ │          │
│        │  │ E.g., "Perfect!" or "Too technical"   │ │          │
│        │  │                                        │ │          │
│        │  └────────────────────────────────────────┘ │          │
│        │                                              │          │
│        │  ┌──────────────────┐  ┌─────────────────┐ │          │
│        │  │ Reject & Revise  │  │ ✓ Approve       │ │          │
│        │  └──────────────────┘  └─────────────────┘ │          │
│        │                                              │          │
│        └──────────────────────────────────────────────┘          │
│                                                                   │
│  [Chat input disabled while approval pending]                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Chat PAUSED, approval modal visible  
**Trigger:** PM Agent called `updateSummary` tool  
**User Action:** Approve or reject the summary  
**Optional:** Provide feedback to help ACE learn

---

## 📱 Wireframe 4: Summary Approved, Chat Continues

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                                  │    │
│  │                                                          │    │
│  │  [... previous conversation ...]                        │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Based on our conversation, I understand your  │    │    │
│  │  │ project. Let me propose a summary:            │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  ✅ Summary Approved                                    │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ HIPAA-compliant multi-tenant healthcare       │    │    │
│  │  │ records system with RBAC, audit logging, and  │    │    │
│  │  │ HL7 integration                                │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Great! Now let me assess the complexity...    │    │    │
│  │  │ Given the HIPAA compliance, multi-tenancy,    │    │    │
│  │  │ and HL7 integration requirements, this looks  │    │    │
│  │  │ like an enterprise-level project.             │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Type your message...                              [📎] │    │
│  │                                                     [→] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ✅ Summary approved (1/2 approvals complete)                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Summary approved, chat continues  
**Visual Feedback:** Green checkmark, summary displayed as approved  
**Progress:** 1/2 approvals complete  
**Agent Behavior:** Continues conversation, working toward complexity classification

---

## 📱 Wireframe 5: Complexity Approval Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                         [PAUSED] │    │
│  │  [... previous conversation with approved summary ...] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│        ┌──────────────────────────────────────────────┐          │
│        │  ╔════════════════════════════════════════╗ │          │
│        │  ║  🏷️ Approve Complexity Classification ║ │          │
│        │  ╚════════════════════════════════════════╝ │          │
│        │                                              │          │
│        │  Classification:                             │          │
│        │  ┌────────────────────────────────────────┐ │          │
│        │  │                                        │ │          │
│        │  │        🏢 ENTERPRISE                   │ │          │
│        │  │                                        │ │          │
│        │  └────────────────────────────────────────┘ │          │
│        │                                              │          │
│        │  Reasoning:                                  │          │
│        │  ┌────────────────────────────────────────┐ │          │
│        │  │ This project requires:                 │ │          │
│        │  │ • HIPAA compliance (regulatory)        │ │          │
│        │  │ • Multi-tenant architecture (complex)  │ │          │
│        │  │ • RBAC and audit logging (security)    │ │          │
│        │  │ • HL7 integration (external systems)   │ │          │
│        │  │                                        │ │          │
│        │  │ These factors indicate enterprise-     │ │          │
│        │  │ level complexity requiring structured  │ │          │
│        │  │ planning and implementation phases.    │ │          │
│        │  └────────────────────────────────────────┘ │          │
│        │                                              │          │
│        │  Feedback (optional - helps AI learn!) 💡   │          │
│        │  ┌────────────────────────────────────────┐ │          │
│        │  │ E.g., "Spot on!" or "Too complex"     │ │          │
│        │  │                                        │ │          │
│        │  └────────────────────────────────────────┘ │          │
│        │                                              │          │
│        │  ┌──────────────────┐  ┌─────────────────┐ │          │
│        │  │ Reject & Revise  │  │ ✓ Approve       │ │          │
│        │  └──────────────────┘  └─────────────────┘ │          │
│        │                                              │          │
│        └──────────────────────────────────────────────┘          │
│                                                                   │
│  [Chat input disabled while approval pending]                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Chat PAUSED, complexity approval modal visible  
**Trigger:** PM Agent called `updateComplexity` tool  
**Display:** Classification badge + detailed reasoning  
**User Action:** Approve or reject the complexity classification

---

## 📱 Wireframe 6: All Approvals Complete

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat Summary                                        │    │
│  │                                                          │    │
│  │  [... full conversation history ...]                    │    │
│  │                                                          │    │
│  │  ✅ Summary Approved                                    │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ HIPAA-compliant multi-tenant healthcare       │    │    │
│  │  │ records system with RBAC, audit logging, and  │    │    │
│  │  │ HL7 integration                                │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  ✅ Complexity Approved: 🏢 ENTERPRISE                  │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ Perfect! I've captured your project details:  │    │    │
│  │  │                                                │    │    │
│  │  │ ✓ Summary defined                             │    │    │
│  │  │ ✓ Complexity classified as Enterprise         │    │    │
│  │  │                                                │    │    │
│  │  │ Ready to move to the next step!               │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │                                                         │      │
│  │              ✅ All approvals complete!                │      │
│  │                                                         │      │
│  │  ┌────────────────────────────────────────────────┐   │      │
│  │  │         Continue to Next Step →                │   │      │
│  │  └────────────────────────────────────────────────┘   │      │
│  │                                                         │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** Both approvals complete, ready to advance  
**Visual:** Success state with summary of approved items  
**User Action:** Click "Continue to Next Step" button  
**System Action:** Advances to workflow step 3 (project naming)

---

## 📱 Wireframe 7: Summary Rejected (Revision Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Workflow: Initialize New Project                   Step 2/10 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Describe Your Project                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  💬 Chat with PM Agent                                  │    │
│  │                                                          │    │
│  │  [... previous conversation ...]                        │    │
│  │                                                          │    │
│  │  ❌ Summary Rejected                                     │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ HIPAA-compliant multi-tenant healthcare       │    │    │
│  │  │ records system with RBAC, audit logging, and  │    │    │
│  │  │ HL7 integration                                │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  📝 Your Feedback:                                      │    │
│  │  "Too technical. Use simpler language for stakeholders" │    │
│  │                                                          │    │
│  │  🤖 PM Agent:                                           │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │ I understand. Let me revise the summary to be │    │    │
│  │  │ more accessible for non-technical stakeholders│    │    │
│  │  │                                                │    │    │
│  │  │ How about:                                     │    │    │
│  │  │ "Secure patient records system for multiple   │    │    │
│  │  │ healthcare providers with privacy compliance  │    │    │
│  │  │ and medical data exchange capabilities"       │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Type your message...                              [📎] │    │
│  │                                                     [→] │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  💡 The agent has learned from your feedback!                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**State:** User rejected summary, agent revises  
**Visual:** Red X, user feedback displayed  
**Agent Behavior:** Uses feedback to generate new summary  
**ACE Learning:** Feedback saved to playbook ("Use simpler language for stakeholders")  
**User Action:** Continue conversation or wait for new proposal

---

## 🎨 Design System Elements

### Color Palette

```
Approved:    #10b981 (green-500)
Rejected:    #ef4444 (red-500)
Pending:     #f59e0b (amber-500)
Agent:       #3b82f6 (blue-500)
User:        #6b7280 (gray-500)
Background:  #f9fafb (gray-50)
Modal BG:    rgba(0, 0, 0, 0.5)
```

### Typography

```
Step Header:     text-sm font-medium text-gray-500
Section Title:   text-lg font-semibold
Agent Messages:  text-base text-gray-900
User Messages:   text-base text-gray-700
Modal Title:     text-xl font-bold
Field Labels:    text-sm font-medium text-gray-700
```

### Spacing

```
Container:       max-w-4xl mx-auto px-6 py-8
Chat Messages:   space-y-4
Modal Padding:   p-6
Button Height:   h-10 px-4
Input Height:    min-h-[44px]
```

---

## 🔄 Interaction States

### Chat Input States

1. **Active** - User can type freely
2. **Disabled (Approval Pending)** - Input grayed out, placeholder: "Approve or reject the proposal above..."
3. **Disabled (Agent Thinking)** - Input disabled, "Agent is typing..." indicator

### Modal States

1. **Summary Approval** - Single text field with optional feedback
2. **Complexity Approval** - Badge + reasoning + optional feedback
3. **Feedback Mode** - Textarea expands on focus

### Button States

1. **Approve** - Primary button (blue), enabled always
2. **Reject** - Secondary button (gray), enabled always
3. **Continue** - Success button (green), only when all approvals done

---

## 📊 Progress Indicators

```
Bottom of screen:

┌─────────────────────────────────────────────────────────┐
│  Progress: 1/2 approvals complete                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ✅ Summary approved                                    │
│  ⏳ Complexity pending...                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 Animation Specs

### Modal Entrance
```css
transition: all 0.2s ease-out
from: opacity 0, scale 0.95
to: opacity 1, scale 1
```

### Chat Message Appearance
```css
transition: all 0.15s ease-in
from: opacity 0, translateY(10px)
to: opacity 1, translateY(0)
```

### Approval Checkmark
```css
transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)
from: scale 0
to: scale 1
```

---

## 📱 Mobile Responsive Wireframe

```
┌─────────────────────────┐
│  ← Workflow   Step 2/10 │
├─────────────────────────┤
│                         │
│  📋 Describe Project    │
│                         │
│  ┌─────────────────────┐│
│  │ 💬 Chat             ││
│  │                     ││
│  │ 🤖 Agent:           ││
│  │ ┌─────────────────┐ ││
│  │ │ Hi! Tell me     │ ││
│  │ │ about your      │ ││
│  │ │ project...      │ ││
│  │ └─────────────────┘ ││
│  │                     ││
│  │ 👤 You:             ││
│  │ ┌─────────────────┐ ││
│  │ │ Healthcare      │ ││
│  │ │ records system  │ ││
│  │ └─────────────────┘ ││
│  │                     ││
│  └─────────────────────┘│
│                         │
│  ┌─────────────────────┐│
│  │ Type message... [→]││
│  └─────────────────────┘│
│                         │
└─────────────────────────┘

Modal (full screen on mobile):

┌─────────────────────────┐
│ 📝 Approve Summary   [×]│
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Healthcare records  │ │
│ │ system with HIPAA   │ │
│ └─────────────────────┘ │
│                         │
│ Feedback (optional):    │
│ ┌─────────────────────┐ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ ┌──────────┐            │
│ │  Reject  │  [Approve] │
│ └──────────┘            │
│                         │
└─────────────────────────┘
```

---

## 🎯 Accessibility Requirements

### Keyboard Navigation
- **Tab** - Navigate between input, feedback textarea, buttons
- **Enter** - Send message (in chat) or approve (in modal)
- **Escape** - Close modal (triggers rejection)
- **Arrow keys** - Navigate chat history

### Screen Reader Announcements
- "Summary approval required"
- "Complexity classification: Enterprise"
- "Summary approved, 1 of 2 approvals complete"
- "All approvals complete, ready to continue"

### ARIA Labels
```html
<div role="dialog" aria-labelledby="approval-title" aria-describedby="approval-description">
<button aria-label="Approve project summary">Approve</button>
<textarea aria-label="Provide optional feedback to help the system learn"></textarea>
```

---

## 💾 State Persistence

If user refreshes or navigates away:

```
┌─────────────────────────────────────────────────────────┐
│  🔄 Resume Conversation                                 │
│                                                         │
│  You have an in-progress conversation from earlier     │
│                                                         │
│  ✅ Summary: "HIPAA-compliant healthcare..."           │
│  ⏳ Complexity: Pending approval                        │
│                                                         │
│  ┌──────────────┐  ┌────────────────────┐             │
│  │ Start Fresh  │  │  Resume Session →  │             │
│  └──────────────┘  └────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Copy/Microcopy

### Agent Initial Message
> "Hi! I'm here to help you describe your project. Tell me what you'd like to build, and I'll guide you through the process."

### After Summary Approval
> "Great! Now let me assess the complexity based on your requirements..."

### After Complexity Approval
> "Perfect! I've captured your project details. Ready to move to the next step!"

### Rejection Response
> "I understand. Let me revise based on your feedback..."

### Feedback Placeholder
> "E.g., 'Perfect!' or 'Too technical, use simpler language'"

### Progress Indicator
> "1 of 2 approvals complete"  
> "All approvals complete!"

---

**Fahad, these wireframes show the complete UX flow!** 🎨

**Key UX Principles:**
✅ **Progressive disclosure** - Show approval modals only when needed  
✅ **Clear feedback** - Visual indicators for approval/rejection  
✅ **Learning signals** - Optional feedback textarea encourages ACE learning  
✅ **Non-blocking** - Chat continues after each approval  
✅ **Mobile-first** - Full-screen modals on small screens  

Want me to create interactive prototypes or refine any specific interaction? 🚀

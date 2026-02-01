# Academic Methodology: BDD, TDD & Testing in Chiron

## Overview

This document captures the **academic rigor** in Chiron's methodology, specifically focusing on:
- **BDD** (Behavior Driven Development) with Gherkin
- **TDD** (Test-Driven Development) with red-green-refactor
- **ATDD** (Acceptance Test-Driven Development)
- User stories with acceptance criteria

This is essential for your master's thesis as it demonstrates systematic software engineering practices.

---

## BDD (Behavior Driven Development) Implementation

### Gherkin Scenarios

Every user story in Chiron includes **Gherkin scenarios** following BDD best practices:

```gherkin
Feature: Project Creation Workflow

  Scenario: User creates a new project successfully
    Given the user is on the project creation page
    When they enter a valid project name "my-app"
    And they click the "Create" button
    Then a new project should be created
    And the user should be redirected to the project dashboard
```

**Gherkin Guidelines Used:**
- **Given**: Preconditions and context
- **When**: Actions and events
- **Then**: Expected outcomes and assertions
- **And/But**: Additional steps
- **Scenario Outline**: Parameterized tests with examples

### BDD in Story Creation Workflow

The `create-stories-workflow.md` explicitly includes:
1. **Step 2**: Story Creation with Gherkin
2. **Step 3**: Gherkin Validation
3. **Gherkin Specialist Agent**: Validates syntax and completeness

**Quality Checklist:**
- Proper Given-When-Then keywords
- Comprehensive coverage of acceptance criteria
- Testable scenarios
- Clear specifications for developers

---

## TDD (Test-Driven Development) Implementation

### Red-Green-Refactor Cycle

Chiron implements **strict TDD** through the TEA (Test Engineering Agent) workflows:

**Phase 1: RED** (Write failing test)
```typescript
// ATDD-generated test (will FAIL initially)
test('user can create project', async () => {
  // Navigate to create page
  await page.goto('/projects/new');
  
  // Fill form
  await page.fill('[data-testid="project-name"]', 'My App');
  
  // Submit
  await page.click('[data-testid="create-button"]');
  
  // Assert (will fail - feature not implemented)
  await expect(page).toHaveURL('/projects/123/dashboard');
});
```

**Phase 2: GREEN** (Make test pass)
- Implement minimal code to pass the test
- No over-engineering

**Phase 3: REFACTOR** (Improve code)
- Clean up implementation
- Maintain passing tests

### Component TDD

```typescript
// Component test with TDD
import { render, screen } from '@testing-library/react';
import { ProjectCard } from './project-card';

describe('ProjectCard', () => {
  test('renders project name', () => {
    // RED: Test fails initially
    render(<ProjectCard name="My Project" />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
    
    // GREEN: Implement component
    // REFACTOR: Clean up
  });
});
```

---

## ATDD (Acceptance Test-Driven Development)

### ATDD Workflow

The **testarch-atdd** workflow generates **failing acceptance tests** before implementation:

**Workflow Steps:**
1. **Parse User Story**: Extract acceptance criteria
2. **Analyze Requirements**: Map to test levels (E2E, API, Component)
3. **Generate Tests**: Create failing tests (TDD red phase)
4. **Create Checklist**: Implementation roadmap for DEV team

### TDD Red Phase Requirements

All ATDD tests must:
- ✅ Use `test.skip()` (intentionally failing)
- ✅ Assert expected behavior (not placeholder assertions)
- ✅ Cover all acceptance criteria
- ✅ Include clear Given-When-Then comments

**Example:**
```typescript
test.describe('Project Creation (ATDD)', () => {
  test.skip('user can create project with valid name', async () => {
    // Given: User is on project creation page
    // When: They enter name and submit
    // Then: Project is created and they see dashboard
    
    await page.goto('/projects/new');
    await page.fill('[data-testid="project-name"]', 'Test Project');
    await page.click('[data-testid="create-button"]');
    await expect(page).toHaveURL(/\/projects\/\d+/);
  });
});
```

---

## User Stories with Acceptance Criteria

### Story Template Structure

Every story follows academic best practices:

```markdown
# Story 1.1: Database Schema Implementation

## User Story
As a developer, I want a database schema for projects and workflows,
so that I can persist workflow execution state and user data.

## Acceptance Criteria (Given-When-Then)

### AC1: Users table exists
**Given** the database is initialized
**When** I query the users table
**Then** it should have columns: id, email, name, created_at

### AC2: Projects table exists
**Given** the database is initialized
**When** I query the projects table
**Then** it should have columns: id, name, user_id, created_at

### AC3: Foreign key constraints
**Given** a project exists with user_id = 123
**When** I try to delete user 123
**Then** the database should prevent deletion (ON DELETE RESTRICT)

## Gherkin Scenarios
```gherkin
Feature: Database Schema
  
  Scenario: Users table has correct columns
    Given the database is initialized
    When I describe the users table
    Then it should contain columns: id, email, name, created_at
```

## Technical Requirements
- PostgreSQL 16
- Drizzle ORM
- UUID primary keys
- JSONB for flexible configuration
```

---

## Testing Framework & Architecture

### TEA (Test Engineering Agent) System

**Agent: Murat (Master Test Architect)**
- Specializes in risk-based testing
- ATDD implementation
- Test fixture architecture
- Quality gates

**TEA Workflows:**
1. **Framework**: Initialize testing framework
2. **Test Design**: Risk-based test planning
3. **ATDD**: Generate failing acceptance tests
4. **Automate**: Expand test coverage
5. **Test Review**: Quality validation
6. **Trace**: Requirements-to-tests mapping
7. **NFR**: Non-functional requirements
8. **CI**: Quality pipeline

### Test Architecture Patterns

**1. Given-When-Then Structure**
```typescript
// Clear BDD structure
describe('Workflow Engine', () => {
  describe('Given a workflow is initialized', () => {
    describe('When the user submits a form', () => {
      it('Then the workflow advances to next step', async () => {
        // Test implementation
      });
    });
  });
});
```

**2. One Assertion Per Test**
```typescript
// Good: Focused test
test('button is disabled when loading', () => {
  render(<SubmitButton loading={true} />);
  expect(screen.getByRole('button')).toBeDisabled();
});

// Bad: Multiple assertions
test('button state', () => {
  render(<SubmitButton loading={true} />);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveClass('loading');
});
```

**3. Deterministic Tests**
- No random data without seeding
- No external dependencies in unit tests
- Time-based tests use fixed timestamps

---

## Academic Rigor Demonstrated

### 1. Systematic Requirements Engineering

**Traceability Matrix:**
| Requirement | User Story | Acceptance Criteria | Test | Status |
|-------------|-----------|-------------------|------|--------|
| R1: Project creation | 1.7 | AC1-AC5 | test-001 | ✅ Pass |
| R2: Workflow execution | 1.4 | AC1-AC8 | test-002 | ✅ Pass |

### 2. Quality Gates

**Implementation Readiness Checklist:**
- ✅ All acceptance criteria are testable
- ✅ Given-When-Then format used
- ✅ Gherkin scenarios comprehensive
- ✅ ATDD tests generated (red phase)
- ✅ Risk assessment completed

### 3. Code Review Standards

**Review Checklist:**
- ✅ All acceptance criteria implemented with evidence
- ✅ Tests follow Given-When-Then structure
- ✅ BDD scenarios pass validation
- ✅ No HIGH severity issues
- ✅ Technical debt documented

### 4. Documentation Standards

**Story Documentation Includes:**
1. User story (As a, I want, So that)
2. Acceptance criteria (Given-When-Then)
3. Gherkin scenarios
4. Technical requirements
5. ATDD checklist
6. Implementation notes
7. Test results

---

## Integration with Chiron

### How BDD/TDD Drives Development

**Workflow:**
1. **Epic Created** → Break down into stories
2. **Story Created** → Write Gherkin scenarios
3. **ATDD Executed** → Generate failing tests
4. **DEV Implements** → Make tests pass (green)
5. **Refactor** → Clean code while tests pass
6. **Code Review** → Validate against AC
7. **Test Review** → Validate test quality

### Academic Value

This demonstrates:
- ✅ **Requirements Engineering**: Structured user stories
- ✅ **Testing Methodology**: BDD/TDD/ATDD
- ✅ **Quality Assurance**: Systematic validation
- ✅ **Documentation**: Traceable specifications
- ✅ **Software Engineering Best Practices**: Industry standards

---

## For Your Master's Thesis

### Include These Academic Elements:

**Chapter: Methodology**
- BDD with Gherkin scenarios
- TDD red-green-refactor
- ATDD workflow
- Acceptance criteria format
- Testing architecture

**Evidence to Include:**
1. Example user stories with Gherkin
2. ATDD test generation workflow
3. Given-When-Then acceptance criteria
4. Test coverage metrics
5. Quality gate validation

**Key Points:**
- Chiron isn't just "building an app"
- It's **systematic software engineering**
- Following **academic rigor** in requirements, testing, validation
- **Traceability** from requirements → stories → tests → code

---

*This document demonstrates the academic methodology underlying Chiron's development process.*
*Generated: January 30, 2026*

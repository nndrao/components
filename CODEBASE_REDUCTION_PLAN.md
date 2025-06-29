# Codebase Reduction Plan

## Current State
- Total lines (excluding components/ui): **23,465 lines**
- Main app-v2 codebase: **22,004 lines**

## Potential Reductions

### 1. Remove Example Files (Immediate: -1,283 lines)
- Location: `/src/app-v2/examples/`
- Files: ConfigServiceExample.tsx, UIComponentsExample.tsx, etc.
- These are not imported anywhere in the codebase
- **Action**: Delete or move to documentation

### 2. Consolidate Data Source Hooks (-200 lines estimated)
- Merge `useDataSource.ts` (147 lines) and `useDataSourceSubscription.ts` (218 lines)
- Total: 365 lines → ~165 lines after consolidation
- **Action**: Create single configurable hook with optional features

### 3. Simplify Debounce Hooks (-50 lines estimated)
- Remove `useDebounce.ts`, keep only `useDebouncedCallback.ts`
- Create simple wrapper if needed
- **Action**: Consolidate debouncing logic

### 4. Consolidate Auto-Save Hooks (-100 lines estimated)
- Make `useAutoSaveWorkspace.ts` use generic `useAutoSave.ts`
- Remove duplicate debouncing logic
- **Action**: Refactor to use composition

### 5. Remove Unused Test Files (-500 lines estimated)
- Old test files that are no longer relevant
- Duplicate test utilities
- **Action**: Audit and remove obsolete tests

### 6. Simplify Type Definitions (-300 lines estimated)
- Consolidate duplicate type definitions
- Create central types module
- Remove redundant interfaces
- **Action**: Create shared types directory

### 7. Optimize Data Provider Abstractions (-400 lines estimated)
- Extract common provider logic to base class
- Reduce boilerplate in implementations
- **Action**: Refactor provider hierarchy

### 8. Remove Dead Code (-200 lines estimated)
- Commented out code blocks
- Unused utility functions
- Old migration code
- **Action**: Clean up identified dead code

## Total Estimated Reduction
- **Immediate removals**: ~1,283 lines
- **Refactoring savings**: ~1,250 lines
- **Total potential reduction**: ~2,533 lines (10.8% of codebase)

## Refactoring Priority

### Phase 1: Quick Wins (No functionality impact)
1. Delete example files
2. Remove commented code
3. Delete unused test files

### Phase 2: Hook Consolidation
1. Merge data source hooks
2. Simplify debounce utilities
3. Refactor auto-save composition

### Phase 3: Type and Architecture
1. Consolidate type definitions
2. Optimize provider abstractions
3. Extract common patterns

## Benefits
- Reduced bundle size
- Easier maintenance
- Better code clarity
- Faster build times
- Reduced cognitive load

## Risks
- Ensure no functionality is lost
- Maintain backward compatibility
- Keep code readable, not just smaller
- Test thoroughly after each change
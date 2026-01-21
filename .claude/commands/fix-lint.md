---
description: Fix all ESLint errors by modifying code to comply with eslint.config.js rules
argument-hint: specific files or patterns to lint
---

# Lint Fix

## User Arguments

User can provide specific files or patterns to focus on:

```
$ARGUMENTS
```

If nothing is provided, lint all applicable files in the project.

## Context

ESLint helps maintain code quality and consistency by enforcing coding standards defined in `eslint.config.js`. This command systematically fixes all ESLint errors by modifying the code to comply with the configured rules.

## Goal

Fix all ESLint errors and warnings to achieve a clean linting result.

## Important Constraints

- **NEVER modify eslint.config.js** - the rules are fixed and must not be changed
- **Fix the code, not the rules** - modify code to comply with the linting rules
- **Analyze complexity of changes** -
  - If there are 2 or more files with errors, or one file with complex/many errors, then **Do not fix yourself** - only orchestrate agents!
  - If there is only one file with simple/minor errors, then you can fix it yourself.

## Key ESLint Rules (from eslint.config.js)

**Type Safety Rules:**
- `@typescript-eslint/no-explicit-any`: error - Ban `any` type
- `@typescript-eslint/no-non-null-assertion`: error - Ban ! non-null assertions
- `@typescript-eslint/no-unsafe-assignment`: error - Ban unsafe type assignments
- `@typescript-eslint/no-unsafe-call`: error - Ban unsafe function calls
- `@typescript-eslint/no-unsafe-member-access`: error - Ban unsafe property access
- `@typescript-eslint/no-unsafe-return`: error - Ban unsafe returns
- `@typescript-eslint/no-unsafe-argument`: error - Ban unsafe arguments

**Code Quality Rules:**
- `@typescript-eslint/no-unused-vars`: error - Unused variables (prefix with `_` to ignore)
- `@typescript-eslint/no-floating-promises`: error - Unhandled promises
- `@typescript-eslint/no-misused-promises`: error - Misused async operations
- `@typescript-eslint/strict-boolean-expressions`: error - Strict boolean checks
- `@typescript-eslint/prefer-nullish-coalescing`: error - Use `??` instead of `||`
- `@typescript-eslint/prefer-optional-chain`: error - Use `?.` instead of `&&` checks

## Workflow Steps

### Preparation

1. **Read sadd skill if available**
   - If available, read the sadd skill to understand best practices for managing agents

2. **Discover linting infrastructure**
   - Read @README.md and package.json
   - Identify the lint command (usually `npm run lint` or `pnpm lint`)
   - Check if `eslint.config.js` exists (it should not be modified)

3. **Run ESLint**
   - Execute the lint command to see all errors
   - If user provided arguments, run: `eslint $ARGUMENTS`
   - Otherwise run the project's full lint command

4. **Identify files with errors**
   - Parse ESLint output to get list of files with errors
   - Group by file for parallel agent execution

### Analysis

5. **Verify single file linting**
   - Launch haiku agent to find proper command to lint a single file
   - Test: `eslint path/to/file.ts`
   - This ensures agents can lint files in isolation

### Lint Fixing

#### Simple Single File Flow

If there is only one file with simple/minor errors, you can fix it yourself:

1. Read the file with errors
2. Understand each ESLint error
3. Fix each error systematically:
   - Replace any with proper types
   - Remove ! assertions and use proper type guards
   - Fix unsafe operations with proper type checking
   - Remove unused variables or prefix with _
   - Use ?? instead of || for null checks
   - Use ?. instead of && for optional chaining
4. Re-run the lint command
5. Iterate until all errors are fixed

#### Multiple Files or Complex File Flow

If there are multiple files with errors, or one file with many/complex errors, use specialized agents:

6. **Launch developer agents (parallel)** (Sonnet or Opus models)
   - Launch one agent per file with lint errors
   - Provide each agent with:
     * **Context**: ESLint errors for this file
     * **Target**: Which specific file to fix
     * **Rules**: Reference eslint.config.js for the rules (DO NOT modify it)
     * **Constraint**: Fix code to comply with rules, never modify eslint.config.js
     * **Goal**: Iterate until file has no ESLint errors

7. **Verify all fixes**
   - After all agents complete, run full lint command again
   - Verify all files pass

8. **Iterate if needed**
   - If any files still have errors: Return to step 5
   - Launch new agents only for remaining errors
   - Continue until 100% pass rate

## Success Criteria

- All ESLint errors fixed ✅
- All ESLint warnings fixed (or justified) ✅
- Code complies with eslint.config.js rules ✅
- eslint.config.js remains unchanged ✅

## Agent Instructions Template

When launching agents, use this template:

```
The file {FILE_PATH} has ESLint errors that need to be fixed.

ESLint errors:
{ESLINT_OUTPUT}

Your task:
1. Read the file {FILE_PATH}
2. Read eslint.config.js to understand the rules (DO NOT modify it)
3. Fix each ESLint error by modifying the code, not the rules:
   - Replace `any` with proper types or `unknown` where appropriate
   - Remove ! non-null assertions; use type guards or optional chaining
   - Fix unsafe type operations with proper type checking
   - Remove unused variables or prefix with _
   - Use ?? (nullish coalescing) instead of ||
   - Use ?. (optional chaining) instead of && checks
   - Handle promises properly with await or .catch()
   - Use strict boolean expressions (no loose truthy checks)
4. Run: eslint {FILE_PATH}
5. Iterate until all ESLint errors are fixed

IMPORTANT: Never modify eslint.config.js - the rules are fixed.
```

## Common ESLint Error Fixes

**@typescript-eslint/no-explicit-any**
```typescript
// Bad
function foo(x: any) { return x; }

// Good
function foo<T>(x: T): T { return x; }
// or
function foo(x: unknown) { /* validate and use */ }
```

**@typescript-eslint/no-non-null-assertion**
```typescript
// Bad
const value = maybeNull!.toString();

// Good
const value = maybeNull?.toString();
// or
if (maybeNull !== null) {
  const value = maybeNull.toString();
}
```

**@typescript-eslint/prefer-nullish-coalescing**
```typescript
// Bad
const value = input || 'default';

// Good
const value = input ?? 'default';
```

**@typescript-eslint/prefer-optional-chain**
```typescript
// Bad
if (obj && obj.nested && obj.nested.value) { }

// Good
if (obj?.nested?.value) { }
```

**@typescript-eslint/no-unused-vars**
```typescript
// Bad
function foo(a: number, b: number) {
  return a;
}

// Good
function foo(a: number, _b: number) {
  return a;
}
```

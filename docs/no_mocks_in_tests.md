# Testing without mocks

## The Problem with Traditional Mocks

Mock objects (along with other test doubles like stubs and spies) have become ubiquitous in testing, but they bring significant downsides:

1. **False Security**: Mocks often test implementation rather than behavior, giving a false sense of security while providing minimal confidence that your system works as intended.
2. **Implementation Lock-in**: Mocks typically verify specific method calls and parameters, meaning refactoring your code can break tests even when the external behavior hasn't changed.
3. **Maintenance Burden**: As a project grows, maintaining mock configurations across numerous tests becomes increasingly difficult. When a dependency's behavior changes, you must find and update every relevant test.
4. **Poor Readability**: Mock-heavy tests tend to be difficult to understand, with complex setup that focuses on interactions rather than outcomes.
5. **Misleading Coverage**: Mocks don't test code that runs in production; they test a simulation of that code.

As one of our source texts colorfully puts it: "Mocks are perhaps one of the worst things to happen to backend development."

## Core Principles for Better Testing

### 1. Focus on Behavior, Not Implementation

Tests should verify what your code does, not how it does it. State-based tests (which check outputs or state changes) are generally preferable to interaction-based tests (which verify method calls).

### 2. Write Narrow, Sociable Tests

Rather than broad end-to-end tests or completely isolated unit tests, prefer "narrow but sociable" tests:

- **Narrow**: Focus on testing a specific behavior or component
- **Sociable**: Use real implementations of dependencies rather than mocks

### 3. Prefer State-Based Testing Over Interaction Testing

Instead of verifying that specific methods were called with specific parameters, check the final state or output of your code:

```python
# Interaction-based test (fragile and implementation-dependent)
def test_moon_phase_with_mocks():
    # Create mocks
    moon = MagicMock()
    date_formatter = MagicMock()
    
    # Configure mock behaviors
    moon.get_percent_occluded.return_value = 100
    moon.describe_phase.return_value = "full"
    date_formatter.format.return_value = "December 8th, 2022"
    
    # Run code under test
    description = describe_moon_phase(Date("2022-12-08"), moon, date_formatter)
    
    # Verify interactions
    moon.get_percent_occluded.assert_called_once_with(Date("2022-12-08"))
    moon.describe_phase.assert_called_once_with(100)
    date_formatter.format.assert_called_once_with(Date("2022-12-08"))
    assert description == "The moon is full on December 8th, 2022."

# State-based test (simpler and more refactoring-friendly)
def test_moon_phase():
    # Use real components with known behavior
    description = describe_moon_phase(Date("2022-12-08"))
    
    # Verify the output
    assert description == "The moon is full on December 8th, 2022."
```

## Code Conversion Strategies

When working with existing code that uses mocks, there are two main approaches for converting to better testing patterns:

### 1. Descend the Ladder

Work your way down from the top of your dependency tree, converting one class at a time:

1. Convert the target class to be nullable
2. Make its immediate dependencies nullable, using throwaway stubs if needed
3. Replace the tests with nullables-based tests
4. Gradually convert the rest of the tree when convenient

### 2. Climb the Ladder

For simpler dependency trees, work from the bottom up:

1. Make low-level infrastructure wrappers nullable first
2. Work upward through the dependency chain
3. Convert each class's tests as you go

### 3. Replace Mocks in Existing Tests

You can incrementally convert mock-based tests to nullable-based tests:

1. Replace each mock with a nulled version of the real dependency
2. Replace mock configurations with configurable responses
3. Replace mock verifications with output tracking

## Conclusion

Testing without mocks results in more maintainable tests that are resistant to refactoring while still providing strong confidence in your code's behavior. The key principles to remember:

1. Separate business logic from infrastructure
2. Use state-based testing over interaction-based testing
3. Create fakes with contracts or nullables for external dependencies
4. Design architecture to support testing with clearly defined boundaries
5. Let tests focus on behavior, not implementation details


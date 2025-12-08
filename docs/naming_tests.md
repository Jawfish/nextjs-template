# Naming tests

## Test Naming

### Plain English Descriptions

Instead of rigid conventions, describe what the system does in plain English:

```python
def test_empty_cart_has_zero_total():
    cart = ShoppingCart()
    assert cart.calculate_total() == 0
```

This example is:

- **Concise** - communicates the essential behavior
- **Readable** - understandable by non-programmers
- **Decoupled** - doesn't include the method name
- **Focused** - describes what the system does, not how it's tested

Write test names that describe behavior under test using terms a non-programmer would understand. This makes tests function as living documentation that even stakeholders can comprehend.

```python
# Poor: test_validate_password_min_length_requirement_false()
# Better: test_password_shorter_than_eight_characters_is_rejected()
```

### The ACE Framework: Action, Condition, Expectation

An effective test name should include three elements:

1. **Action**: What functionality is being tested
2. **Condition**: Under what circumstances
3. **Expectation**: With what expected result

For example:

```python
def test_order_with_no_products_is_invalid():
    order = Order()
    assert not order.is_valid()
```

The name clearly expresses:

- **Action**: order validation
- **Condition**: with no products
- **Expectation**: is invalid

### Behavioral Descriptions

Focus on describing behaviors rather than methods:

```python
def test_delivery_with_a_past_date_is_invalid():
    yesterday = datetime.now() - timedelta(days=1)
    delivery = Delivery(date=yesterday)
    service = DeliveryService()
    assert not service.is_delivery_valid(delivery)
```

This is a "straight-to-the-point statement of a fact, which itself describes one of the aspects of the application behavior under test." Don't include the name of the SUT's method into the test name. Remember, you don't test code, you test application behavior:

```python
# Poor: test_calculate_discount_for_loyal_customer()
# Better: test_loyal_customers_receive_ten_percent_discount()
```

Tests should focus on what is being tested, not how it's tested. This creates more robust tests that survive refactoring:

```python
# Poor: test_database_query_returns_filtered_results()
# Better: test_search_returns_only_active_users()
```

A test is an atomic fact about a unit of behavior:

```python
# Poor: test_user_should_be_notified_after_password_change()
# Better: test_user_is_notified_after_password_change()
```

## Examples of Test Names

```
# Before: test_authenticate_invalid_credentials_returns_false()
# After: test_authentication_fails_with_incorrect_password()
# Before: test_process_payment_insufficient_funds_throws_exception()
# After: test_payment_is_rejected_when_account_has_insufficient_funds()
# Before: test_register_user_duplicate_email_returns_error()
# After: test_registration_rejects_already_used_email_address()
```


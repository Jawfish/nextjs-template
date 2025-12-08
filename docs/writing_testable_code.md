# Writing testable code

## Separate Business Logic from Infrastructure

Code that involves external systems (databases, APIs, file systems) is inherently harder to test. Explicitly separate this infrastructure code from your business logic.

```python
# Don't do this: mixing business logic and database operations
def save_user(db_connection, user):
    if user.email_address == "":
        return Error("user requires an email")
    if len(user.password) < 8:
        return Error("user password requires at least 8 characters")
    hashed_password = hash_password(user.password)
    db_connection.execute(
        "INSERT INTO users (password, email_address, created) VALUES (?, ?, ?)",
        (hashed_password, user.email_address, datetime.now())
    )
    return Success()

# Better approach: separate validation logic from database operations
def validate_user(user):
    if user.email_address == "":
        return Error("user requires an email")
    if len(user.password) < 8:
        return Error("user password requires at least 8 characters")
    return Success()

def save_user_in_db(db_connection, user):
    hashed_password = hash_password(user.password)
    db_connection.execute(
        "INSERT INTO users (password, email_address, created) VALUES (?, ?, ?)",
        (hashed_password, user.email_address, datetime.now())
    )
    return Success()
```

## Nullables Pattern

**Nullables** are real production code with an "off switch" that prevents external interactions. They provide realistic behavior without side effects.

The key components of Nullables are:

1. **Infrastructure Wrappers**: Classes that encapsulate all interactions with external systems.
2. **Embedded Stubs**: Internal implementations that replace external dependencies.
3. **Configurable Responses**: Ways to control what a Nullable returns.
4. **Output Tracking**: Methods to observe what a Nullable would have output.
5. **Behavior Simulation**: Methods to simulate events from external systems.

```python
# Infrastructure wrapper for a weather API
class WeatherService:
    @classmethod
    def create(cls, api_key=None):
        """Create a real weather service"""
        return cls(RealWeatherApi(api_key or os.getenv("WEATHER_API_KEY")))
    
    @classmethod
    def create_null(cls, responses=None):
        """Create a nulled weather service"""
        return cls(StubbedWeatherApi(responses or {"New York": 72}))
    
    def __init__(self, weather_api):
        self._api = weather_api
        self._output_tracker = OutputTracker()
    
    def get_temperature(self, city):
        """Get the temperature for a city"""
        temp = self._api.get_temperature(city)
        # Track the output for testing
        self._output_tracker.track("temperature_request", {"city": city, "temp": temp})
        return temp
    
    def track_temperature_requests(self):
        """Return an object to track temperature requests"""
        return self._output_tracker.for_event("temperature_request")

# Embedded stub that replaces the real API
class StubbedWeatherApi:
    def __init__(self, responses):
        self._responses = responses
        
    def get_temperature(self, city):
        if city not in self._responses:
            raise ValueError(f"No stubbed temperature for {city}")
        return self._responses[city]

# Example test using a nullable
def test_weather_report():
    # Create a nullable with configured responses
    weather = WeatherService.create_null({"Seattle": 65, "Portland": 72})
    tracker = weather.track_temperature_requests()
    
    # Create the code under test
    report = WeatherReport(weather)
    
    # Run the code
    result = report.compare_cities("Seattle", "Portland")
    
    # Verify the output
    assert result == "Portland is warmer than Seattle by 7 degrees"
    
    # Optionally verify the specific requests made
    requests = tracker.data
    assert len(requests) == 2
    assert requests[0]["city"] == "Seattle"
    assert requests[1]["city"] == "Portland"
```

The Nullables pattern gives you the speed and reliability of isolated tests with the behavioral coverage of integration tests.

## The "Logic Sandwich" Architecture

The "A-Frame" or "Logic Sandwich" architecture separates your code into three layers:

1. **Logic**: Pure computation with no external dependencies
2. **Infrastructure**: Code that interfaces with external systems
3. **Application**: Code that coordinates between Logic and Infrastructure

The Application layer implements a "logic sandwich" pattern:

- Read data using the Infrastructure layer
- Process it using the Logic layer
- Write results using the Infrastructure layer

```python
# Logic layer - pure computation
class TaxCalculator:
    def calculate_tax(self, amount, tax_rate):
        return amount * tax_rate / 100

# Infrastructure layer - interfaces with external systems
class CustomerRepository:
    @classmethod
    def create(cls):
        return cls(Database.connect(os.getenv("DATABASE_URL")))
    
    @classmethod
    def create_null(cls, customers=None):
        return cls(InMemoryDatabase(customers or {}))
    
    def __init__(self, database):
        self._db = database
        
    def get_customer(self, customer_id):
        return self._db.query("SELECT * FROM customers WHERE id = ?", customer_id)

# Application layer - coordinates between Logic and Infrastructure
class InvoiceService:
    def __init__(self, customer_repo=None, tax_calculator=None):
        self._customer_repo = customer_repo or CustomerRepository.create()
        self._tax_calculator = tax_calculator or TaxCalculator()
    
    def create_invoice(self, customer_id, amount):
        # Read data from infrastructure
        customer = self._customer_repo.get_customer(customer_id)
        
        # Process with logic
        tax_amount = self._tax_calculator.calculate_tax(amount, customer.tax_rate)
        total = amount + tax_amount
        
        # Write back through infrastructure
        invoice = Invoice(customer_id, amount, tax_amount, total)
        return self._invoice_repo.save(invoice)
```

Each layer can be tested independently:

- Logic layer: Simple unit tests with direct inputs and outputs
- Infrastructure layer: Narrow integration tests with real external systems
- Application layer: Tests using nulled infrastructure

## Fakes with Contracts

**Fakes** are simplified but functional implementations of dependencies that implement the same interface as the real dependency. Unlike mocks, fakes maintain state and behave like the real thing.

**Contracts** are tests that verify a fake behaves the same way as the real implementation. They codify your assumptions about how the dependency works.

```python
# An interface for a file storage service
class FileStorage(ABC):
    @abstractmethod
    def save(self, file_name, content):
        pass
    
    @abstractmethod
    def load(self, file_name):
        pass

# A fake implementation for testing
class InMemoryFileStorage(FileStorage):
    def __init__(self):
        self.files = {}
        
    def save(self, file_name, content):
        self.files[file_name] = content
        
    def load(self, file_name):
        if file_name not in self.files:
            raise FileNotFoundError(f"File {file_name} not found")
        return self.files[file_name]

# A contract test to verify both implementations behave the same way
def file_storage_contract(storage_factory):
    # Test saving and loading a file
    def test_save_and_load():
        storage = storage_factory()
        storage.save("test.txt", "hello world")
        content = storage.load("test.txt")
        assert content == "hello world"
    
    # Test loading a non-existent file
    def test_load_nonexistent():
        storage = storage_factory()
        with pytest.raises(FileNotFoundError):
            storage.load("nonexistent.txt")
            
    # Run the tests
    test_save_and_load()
    test_load_nonexistent()

# Run the contract against both implementations
def test_in_memory_storage():
    file_storage_contract(lambda: InMemoryFileStorage())
    
def test_real_storage():
    file_storage_contract(lambda: RealFileStorage("/tmp"))
```

Fakes are particularly valuable for:

- Testing stateful workflows across multiple operations
- Integration testing without slow external dependencies
- Local development without complex infrastructure setup

## Unit Test Pure Logic Only

Only unit test logic and validation that can be isolated. These should be pure functions or objects where outputs are determined solely by inputs.

```python
# Pure logic function - perfect for unit testing
def calculate_discount(purchase_total, customer_tier):
    if customer_tier == "gold":
        return purchase_total * 0.10
    elif customer_tier == "silver":
        return purchase_total * 0.05
    else:
        return 0

# Simple unit test
def test_calculate_discount():
    assert calculate_discount(100, "gold") == 10
    assert calculate_discount(100, "silver") == 5
    assert calculate_discount(100, "bronze") == 0
```

## Use Integration Tests for Infrastructure

Test database operations, API calls, and other infrastructure with integration tests that use real connections. Focus these tests narrowly on the infrastructure wrappers.

```python
# Infrastructure code with integration test
class UserRepository:
    def __init__(self, connection):
        self._connection = connection
    
    def save(self, user):
        self._connection.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (user.name, user.email)
        )
    
    def find_by_email(self, email):
        result = self._connection.execute(
            "SELECT * FROM users WHERE email = ?", 
            (email,)
        ).fetchone()
        if not result:
            return None
        return User(result["name"], result["email"])

# Integration test
def test_user_repository():
    # Set up a test database
    connection = create_test_database()
    
    # Create the repository
    repo = UserRepository(connection)
    
    # Test saving and retrieving a user
    user = User("Test User", "test@example.com")
    repo.save(user)
    
    # Verify the user was saved
    found_user = repo.find_by_email("test@example.com")
    assert found_user is not None
    assert found_user.name == "Test User"
    assert found_user.email == "test@example.com"
```

## Use Overlapping Sociable Tests

Write tests that execute a component along with its real dependencies. These tests form an overlapping chain that ensures components work together correctly.

```python
# Components in a dependency chain
class HttpClient:
    # Low-level infrastructure wrapper
    # ...

class AuthClient:
    def __init__(self, http_client=None):
        self._http = http_client or HttpClient()
    
    def login(self, username, password):
        response = self._http.post("/auth/login", {
            "username": username,
            "password": password
        })
        return AuthToken(response["token"])

class UserService:
    def __init__(self, auth_client=None):
        self._auth = auth_client or AuthClient()
    
    def authenticate_user(self, username, password):
        token = self._auth.login(username, password)
        return User(username, token)

# Overlapping sociable test
def test_user_service_authentication():
    # Create nulled HttpClient for testing
    http_client = HttpClient.create_null({
        "/auth/login": [{"token": "test-token"}]
    })
    
    # Create real AuthClient with nulled HttpClient
    auth_client = AuthClient(http_client)
    
    # Create UserService with real AuthClient
    user_service = UserService(auth_client)
    
    # Test the full chain
    user = user_service.authenticate_user("testuser", "password")
    
    # Verify the result
    assert user.username == "testuser"
    assert user.token.value == "test-token"
```

## Infrastructure Wrappers with Zero-Impact Instantiation

Ensure infrastructure code doesn't perform significant work in constructors. This allows tests to instantiate dependencies without triggering network calls or other side effects.

```python
class DatabaseClient:
    @classmethod
    def create(cls):
        return cls(os.getenv("DATABASE_URL"))
    
    def __init__(self, connection_string):
        # Store the connection string but don't connect yet
        self._connection_string = connection_string
        self._connection = None
    
    def connect(self):
        # Connect only when needed
        if not self._connection:
            self._connection = create_connection(self._connection_string)
        return self._connection
```

## Parameterless Instantiation

Provide factory methods that create objects with sensible defaults, including dependencies. This makes test setup much simpler.

```python
class OrderProcessor:
    @classmethod
    def create(cls):
        return cls(
            customer_repository=CustomerRepository.create(),
            product_repository=ProductRepository.create(),
            payment_service=PaymentService.create()
        )
    
    @classmethod
    def create_null(cls, **overrides):
        defaults = {
            "customer_repository": CustomerRepository.create_null(),
            "product_repository": ProductRepository.create_null(),
            "payment_service": PaymentService.create_null()
        }
        defaults.update(overrides)
        return cls(**defaults)
    
    def __init__(self, customer_repository, product_repository, payment_service):
        self._customers = customer_repository
        self._products = product_repository
        self._payments = payment_service
```

## Collaborator-Based Isolation

When testing code that depends on complex objects, use the dependencies to define part of your test expectations. This provides better isolation from changes in those dependencies.

```python
def test_report_with_address():
    # Create a test address and report
    address = Address.create_test(street="123 Main St")
    report = Report([address])
    
    # Use the address to define the expected output
    expected = f"Report for {address.render_one_line()}"
    
    # Verify the report uses the address correctly
    assert report.header() == expected
```


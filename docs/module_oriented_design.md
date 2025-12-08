# Module-oriented design

Module-oriented design isn't a formally-recognized paradigm of programming, but it's a helpful mental model writing clean, encapsulated code in a non-OOP environment. Modules are different from objects in that they are **not an instance of a data type**. They can be thought of as "singletons"; that is, a single file with definitions that inherently cannot be instantiated multiple times. Taking this approach can help produce [well-designed abstractions](abstraction.md).

When taking a module-oriented approach, you modularize by **accretion** - gradually building up functionality as needed, then splitting *after* a module is too large, preventing **[Over-encapsulation](over_encapsulation.md)**. This is in contrast to OOP, where you modularize by speculation—splitting *before* a module is too large. Taking the former approach helps prevent **over-encapsulation** . The ultimate goal should be to minimize the proportion of stateful code by moving as much code as possible from state modules to logic modules.

## The Modules

When writing module-oriented code, you separate the code into two distinct modules: state and logic. The **state module** is responsible for managing the state of the application, while the **logic module** handles all of the business logic.

The separation between state and logic modules is one-way. The state module calls functions from the logic module, but not the other way around. Additionally, logic modules are pure and do not change any state.

### Logic Modules

Logic models are **stateless** modules that contain pure functions - they have no internal state, and do not reach out for external state. Logic modules should distinguish between **public functions** and **private functions** to minimize exposed surface area. Private functions are for internal use within only that module, while other modules interact only with a logic module's public functions.

### State Modules

State modules are **stateful** modules that contain variables and data structures that represent the state of the application. State modules should encapsulate their private state and only expose public interfaces to other modules. State modules should also be responsible for validating and updating their state according to the logic provided by logic modules. By separating state from logic, state modules can reduce coupling by minimizing dependencies on other modules, and increase cohesion by focusing on managing their own state.

### Data Types

In theory, data types don't belong to any modules, but rather should be standalone. In practice, data types must be defined *somewhere*, so they're typically defined in the module where they're predominantly used. If you want to encapsulate operations on a given data type, that data type may be placed in the same module as those functions.

## Resources

- [Object-Oriented Programming is Good* - YouTube](https://www.youtube.com/watch?v=0iyB0_qPvWk)
- [The Hikikomori's Guide to JavaScript](https://robotlolita.me/old-posts/2013-04-27-the-hikikomoris-guide-to-javascript.html)


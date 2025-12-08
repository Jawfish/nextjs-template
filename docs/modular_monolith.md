# Modular Monoliths

**NOTE:** This is different from module-oriented design ([Module-oriented design](module_oriented_design.md)). You can implement MM without MOD, and you can implement MOD without MM; but they work well together.

Think about code in terms of isolated, independent modules. Taking a microservice approach to separation of concerns and applying it to local, monolithic contexts provides the advantage of modular, manageable code without the overhead of a distributed system. I call this a **modular monolith**.

Each module in the monolith acts like a mini-app, responsible only for its own specific functionality. Schemas are the only thing shared between modules, forming contracts between them to ensure consistent communication. Just like we wouldn't say a protocol belongs more to a client or a server, schemas are conceptually separate from modules.

At the layer above the modules is an orchestrator. One common pattern for this orchestrator is to use an event bus. The event bus doesn't care about what modules exist or how they're implemented. Its job is simply to act as a mediator, passing messages between modules.

While this approach keeps interfaces clean and can make it easier to reason about the system, it introduces some challenges like managing message flows between modules.


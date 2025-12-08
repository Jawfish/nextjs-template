Well-designed abstractions make a system easier to reason about. Abstractions manage complexity and improve maintainability. They define the structure and behavior of components while hiding implementation details. However, **overuse can lead to [unnecessary complexity](over_encapsulation.md)**, so it's important to balance their usage.

A layered system design, where each layer depends only on the one beneath it, promotes loose coupling. This approach allows individual components to be modified without affecting the entire system. As long as interfaces remain stable, changes in implementation details won't disrupt the system.

> sometimes grug go too early and get abstractions wrong, so grug bias towards waiting
>
> big brain developers often not like this at all and invent many abstractions start of project
>
> grug tempted to reach for club and yell "big brain no maintain code! big brain move on next architecture committee leave code for grug deal with!"  
> …  
> grug notice that introducing too much abstraction often lead to refactor failure and system failure.
>
> - <https://grugbrain.dev>

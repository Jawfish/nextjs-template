# Over-encapsulation

*Rule of thumb: stick to **one layer of abstraction***

Over-encapsulation makes a system harder to reason about. If a function needs a reusable abstraction, but it's not needed elsewhere, **make that functionality internal**, such as within a nested function, IIFE, or sub-scope. This keeps things **logically grouped**, so when you read the function, you can understand more of its functionality in isolation, and when you are viewing the codebase, it's less cluttered by unnecessary abstractions.

```js
function nested(){
 function doStuff(){...}
 function doMoreStuff(){...}
 doStuff();
 doMoreStuff();
}

function iife(){
 // do stuff
 function(){...}();
 // do more stuff
 function(){...}();
}

function subScope() {
 // do stuff
 { ... }
 // do more stuff
 { ... }
}
```

Over-encapsulation may look like pulling functionality out of function A into function B, even if function A is the only function that calls function B.

- It can be difficult to tell what this function does in isolation.
- If the abstractions are not needed elsewhere, it's not necessary to abstract the functionality further.  

```js
// Over-encapsulation example

function processData() {
    extractAndFormatData();
    calculateStatistics();
}

function extractAndFormatData() {
    // Code for extracting and formatting, used only in processData
}

function calculateStatistics() {
    // Code for calculating statistics, used only in processData
}
```

```js
// Internalizing functionality

function processData() {
    function extractAndFormatData() {
        // Code for extracting and formatting
    }

    function calculateStatistics() {
        // Code for calculating statistics
    }

    extractAndFormatData();
    calculateStatistics();
}
```


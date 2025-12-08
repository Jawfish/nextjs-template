September 15, 2015

The fail fast principle is underlying for many other software development practices. It comes out so often that it’s hard to cover all its appearances in a single article. Nevertheless, that is exactly what I’m going to do here :)

## The fail fast principle

The fail fast principle stands for stopping the current operation as soon as any unexpected error occurs. Adhering to this principle generally results in a more stable solution. It might appear counter-intuitive at first. How is it so that failing at any error leads to stability? Isn’t it backward?

Indeed, when you start applying this practice, application crashes might seem overwhelming, especially if you have a working software whose developers didn’t stick to fail-fast before. But if you don’t give up, grit your teeth and fix all the code causing those failures, you will benefit from it greatly.

The trick here is that adhering to the fail fast principle, we improve the feedback loop. We quickly reveal all problems in our software making it easier to spot and fix them.

## Fail-silently

The opposite to fail-fast is fail-silently. How often did you encounter such code?

```csharp
try {     DoSomething(); } catch (Exception ex) {     Logger.Log(ex); }
```

A common justification for wrapping everything in a generic try-catch block is that it makes a software feel more stable by not letting end users know about errors in it.

I bet you already know swallowing exceptions in a generic try-catch block generally is a bad practice. But why is it so, exactly?

The problem with such approach is that instead of revealing issues in the software, we mask them and thus extend the feedback loop. If something goes wrong with the application, it wouldn’t be obvious. The incorrect behavior is now hidden from the eyes of developers and end users and might stay unnoticed for a long time.

Moreover, the application’s persistence state may get corrupted if the code continues executing after an error took place.

The fix here is simple, we just need to add a "throw" statement to the catch block:

```csharp
try {     DoSomething(); } catch (Exception ex) {     Logger.Log(ex);     throw ; }
```

Check out [this article](https://enterprisecraftsmanship.com/2015/02/26/exceptions-for-flow-control-in-c/) to read more on how to work with exceptions.

## Benefits of the fail fast practice

So, what are the benefits the fail fast principle provides?

-   **Shortening the feedback loop**. The costs of fixing a bug found while software is under development is an order of magnitude less than when it’s in production. It is remarkable how quickly bugs are revealed when you stick to the fail fast principle. Even if the application is in production, you are still better off letting the end users know if something went wrong with it.
    
-   **The confidence the software works as intended**. You might have heard about some strongly-typed functional languages. Their type system is so strict that if you manage to compile a program written in such language, then it most likely will work right. We can say the same about a program written with the fail fast principle in mind. If such program is still running, it most likely does its job correctly.
    
-   **The protection of the persistence state**. I mentioned this issue earlier. If we allow the software to continue working after an error occurs, it may come into an invalid state, and, more importantly, save that state to the database. This, in turn, leads to a bigger problem - data corruption - which can’t be solved just by restarting the application.
    

Failing silently is like burying your head in the sand. It doesn’t solve the underlying problem, only pretends the problem isn’t there.

## The fail fast principle in practice

In most cases, adhering to the fail fast principle means we should shut down the application (probably, with a polite apology) in case of any unexpected situation.

There are cases where we don’t have to kill the whole process, though. If the software is inherently stateless meaning that it doesn’t store any state in memory between the operations, it might be just fine to halt only the operation the error took place in and let the application continue working.

An example here is a web server. Requests it processes don’t leave any marks in the server’s memory so we don’t have to shut it down. Another good example would be a background job.

## The fail fast principle and design by contract

The principle is highly related to the design by contract concept.

The main purpose of code contracts is to give the ability to quickly determine issues in our code. Design-by-contract programming takes the fail fast principle to its extreme. It prescribes that software developers should define a formal set of rules the code itself and its clients should live by and crash the application if any violation of those rules takes place.

The great strictness makes it even possible to create static analyzers on top of the code contracts so that the problems can be revealed on the compilation stage, without ever launching the app.

## Examples

There are plenty of examples of both adhering to the fail fast principle and violating it.

The work with configuration files is a good one. There are two ways of reading a config file. The fail fast approach would be fetching all the required values and validating them at once on the application start. If any of them is missing or invalid, the process should crash.

The opposite approach is to read the values ad hoc and fail (or even silently proceed) only when a setting is actually needed in the code.

The benefit of failing fast here is obvious: you don’t have to wait until some piece of code reveals the configuration is incorrect. If the application was successfully launched, you can be sure there wouldn’t be any issues with the config file later on.

Another example is nulls in such languages as C# and Java. Without a strict distinction between the types that allow for nulls and the types that don’t, it’s hard to see whether a particular instance had turned into null because a developer wanted it to or by a mistake.

Not only can null reference exceptions be tedious, they are often difficult to nail down. The reason is that they tend to occur not when the actual null assignment took place but rather when the instance was dereferenced. These two actions can be separated from each other by many lines of code, which makes it hard to find out what causes the problem.

The best solution here would be introducing non-nullable reference types as a language construct so that compiler wouldn’t allow such things as assigning null to an instance of a non-nullable type. Unfortunately, it is [hardly feasible in the near future](https://github.com/dotnet/roslyn/issues/5032) (at least for the C# language).

The second best solution for the problem would be throwing an exception in run-time as soon as the unexpected assignment takes place. I wrote about this approach [here](https://enterprisecraftsmanship.com/2015/03/13/functional-c-non-nullable-reference-types/), check it out for more details.

## Summary

Following the fail fast principle can become a great source of confidence your application works correctly. The main point here is that we shouldn’t let any unexpected situation escape our attention.

Let your software fail fast. That, in turn, would allow you to quickly fix any problem in it.
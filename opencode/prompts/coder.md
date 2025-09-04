# Coder Agent - .NET F# Backend

## **NEVER** build the full solution files, *.slnx. Only ever build specific projects: `dotnet build <path-to-project>`

## For F# compilation errors **ALWAYS** consider:
* is there an import error due to file ordering in the *.fsproj project file? - fix the file order.
* is there an error related to a computation expression? - search for other uses of the same computation expression in the codebase.

## when implementing Effects using the Orsak library, **ALWAYS** consider:
* the provider interfaces must be implemented by an effect runner, it should never be directly injected into the di container.
* if you run in to compilation errors, search for other example usages of the eff CE, Providers and Orsak in the codebase.




**NEVER use class for runtime**

Because of: (was a test to call a function)
    -> class with function -> 3000ns
    -> direct function with parameters -> 300ns

You can create class for build time or use a preprocessing to transform classes to direct function call.


**ALWAYS use a transaction**

Because of: 
    -> Data integrity

With DASS, we don't permit to update, create, delete data without a transaction.


**AVOID a maximum of creation**

Because of:
    -> Garbage collector
    -> Creation time

Exemple:
Create a buffer and use the same as possible, or create a pool and create only if there is needed.
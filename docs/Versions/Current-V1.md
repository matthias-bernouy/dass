

# Objective

Make a version 1 stable with basic of the app

# TODO

## Document Core

### Document Controller - C
- Research ( get the document#5165487 )
Document : 
    - ID
    - TypeDocument (User, Product, Bank...)
    - PersistentData (Data which is commited)
    - StagedData
    - TX_Element_Status

StagedData :
    - tx_id
    - data
    
Shard: 
    - ShardID
    - document_id_counter
    - documents

FreeListItem
    - ShardID
    - DocumentIDInShard
    - free_list_counter

A transaction_provider_document.c ( see transaction_provider_identity_map.c )

A StagedData is a pointer. During creation of a new StagedData, we create a new memory link with calloc.
Then, we do an atomic_store of the new pointer. This is to avoid a crash during the update of stagedData.
Do not forgot to free the old staged data.
The same logic is for the PersistentData when commit transaction : create object, replace pointer, free old pointer.

A shard could have only 65 536 Documents
App could have 2^32 shards, but, for the moment, we create a static tab with 65 536 shards ?
An ID is composed of 64bits of salt, 32bits for the shardid, 16bits for the documentid in the shard. There is 16bits free for ????

IDs are not create randomly, we fill a shard before create in another shard. When we try to get a new id, check the FreeList if there is an id.

### Document Templates - C
Types allowed for the version 1 :
    - uint8[] *used for string and raw data*
    - uint32
    - uint64
    - int32
    - int64
    - bool
Template are very simple for the moment, no conditions, no loops, no array except for uint8[]
We only create a structure with fields names and call the correct setter or getter.
Maybe, we need an interface with the Document Controller ? Document Template should not directly interact with Transaction ?

### Document Generator - JS
For the moment, we create the generate in js with ts to have types for end developers.
Only "schema with fields (name, type)"
Then, take the document templates and generate the C file for this schema.

## Transaction Core

### Checks all functions - C
ERRORS, Atomic issues...

### Abort function - C
Just call the providers with abort probably ?


## IdentityMap Core

### Check all functions - C
ERRORS, Atomic issues...

### Unlink function - C
Restart the function, check with link how it works.


## Tests

### Test worker crash at the badly moments to see data integrity
How to check if a worker crash at a specific line in the C code ? Maybe with defined(??TESTS??) ?

### Test performance 1 vs 4 vs 8 vs 16 workers
With random but a specific seed to retry the same test always.

## Bridge - JS

Open the .so and includes all the public functions with Bun:FFI
Then, create functions to interact with schemas.
(TX, IdentityMap, Schemas generated)




THIS DOCUMENT IS ONLY TO HAVE AN IDEA OF WHAT WE ARE DOING, THIS IS NOT THE FINAL PROCESS
IF YOU HAVE IDEAS TO IMPROVE THE APP, LET'S TALK
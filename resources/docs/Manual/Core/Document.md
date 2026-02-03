# What is a document ?

When you create a document, it generate multiple C functions, structures and the JS Library to manage your data.

## The DocumentID

To be able to decentralized your data, we need static id with informations.
An ID is composed of : 
    -> 64bits of salt
    -> 16bits of zone
    -> 32bits of shard
    -> 16bits of id

The salt is just a random number.

***The 16bits of zone***
The zone is used to filter nodes which have this tag.
Because of: 
    If there is private data legislation, for example RGPD, we should want the data of European user is stored in Europe.
See more in Node.md

***32bits of shard***
The shard is the element which can move between nodes to reduce the charge of a node.
Each shard contains only one type of document.
See more in Node.md

***16bits of id***
The id in the shard to select quickly the document in the node.
See more in Node.md

## Document Definition

### Available Types

#### String type

#### Number type

#### Raw type
Coming soon.

#### Relation type
Coming soon.

#### Object Type
Coming soon.

#### Media Type
Coming soon.
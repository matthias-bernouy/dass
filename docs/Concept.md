# 1. Keys of description

## 1.1 A memory database in javascript application

### 1.1.1 Why ? 
To not have the network communication latency (local or external) with an other Database.
To not have the parsing of data for the target Database.
To not have to managed the external Database creation, the credentials and the configuration.

### 1.1.2 How ?
The Database is directly in the process of the javascript application.
So, workers can directly access to the data in the ram with the bridge.

SOMES INFORMATIONS
-> Documents IDs are : 64 bits of salt, 32 bits for the shardID and 16 bits for the documentInShardID
So, a single shard can store a maximum of 65 536 documents and we can have 2^32 shards.
Shards are distributed with all servers you have run for this application.

## 1.1.3 Additionnals Features
For the simple tasks, like conditionnal fields, the system generate parts of them directly in C.
	-> A user have to get more than 0 of a balance
	-> An email on user is unique
	-> A user balance is calculated with all transactions

Later, you can add Authorization and Authentication system very simply.

## 1.1.4 Developper experience
A developer or a company wants to start a new API, they can use our solution.
	-> They need to have Bun, a C compiler.

Then, start the project with 
```bun dass start````

Then, create data schemas likes DB but with additionnals features
```ts
EXAMPLE IN PROGRESS
```

Then configure entries points (HTTP)
```ts
EXAMPLE IN PROGRESS
```

If there is business logique, they can add to the entries points, 
but the system do the most important parts of work with some hooks

Then, build the project with
```dass build```

Then, you can start the project, which is a multi workers multi location, so if you have a 32 cpus server, 32 threads works together.
If your app is growing, you can add additionnals servers with our decentralized systems.
```IN PROGRESS```
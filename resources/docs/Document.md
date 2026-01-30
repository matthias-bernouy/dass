Document
Use a predictible random hash with weight to distribute shards
Client get servers with weight and a global seed.
weight of a server change if he is saturated ( 1 -> 0.80 )
With a tag (filter) to store data only on specifics servers.
EX: RGPD(Europe), so when a document is created, the document have the #5 filter which is Europe
When client calculate the shards correspondances, he filter the servers who have this tag.
SO
An id of document is : [64bits:salt][16bits:zone][32bits:shardID][16bits:IdInShard]

We can have 2^48 documents for each zone, but we can have Global1, Global2, Global3 if we need more documents. Just to add to all servers these tags.



Same for IdentityMap and Views


IN reflection
Views is a SQL Query like, but build during the compilation.
Views is read only, so, for User Documents which are distributed between 10-20-50 servers. We can't, i think ask to all the data, then a final filter / order on client machine.
So, there is Views which synchronyse data with the Writer Nodes, the data could be not up to date (10-50ms), but it doesn't matter because there is not writing.
If user wan't the data up to date, he ask directly to the writer node.

But who can host the view ? The view could be sharded ? 
Because, is there is 150 billions of Transactions, a single node can't process the transaction.

But, we know the conditions, sorting etc.
For example, if there is select tx where balance > x and user = y

View could be sharded by user ? (like an index after all)

What's the objective ? No more than 100 000 documents to pase ? 1 000 000 documents ? 10mo ? 100mo ? 
How to distribute indexes ? What calculation to define what node have this specific view ? 

If where is about an unique field ? use the idmap but in readonly
If where is about an "foreign key" ? Is there multiple documents with the foreign key ? a limit ? 
If where is about an random field like "get all users where balance is < 1000 AND user.type = company AND ... AND ..."

If two views are about the same foreign key ?

How much views are created for an application ? 10 ? 100 ? 1000 ?
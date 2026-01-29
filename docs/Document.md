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
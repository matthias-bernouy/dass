

Actually, perf tests are "bad"

perf stat -e cycles,instructions,cache-references,cache-misses,bus-cycles bun test

Opérations par seconde : 1,516,230.983 ops/s

   727 385 801 051      cycles                                                                
 1 504 559 133 356      instructions                     #    2,07  insn per cycle            
     9 524 696 211      cache-references                                                      
     1 229 037 409      cache-misses                     #   12,90% of all cache refs         

      15,666964523 seconds time elapsed

     166,276299000 seconds user
       7,231535000 seconds sys

We lose +- 30-40% of cpu because of cache waiting




NOW : 

Opérations par seconde : 6,042,932.938 ops/s

 Performance counter stats for 'bun test':

   194 331 564 461      cycles                                                                
   172 577 243 238      instructions                     #    0,89  insn per cycle            
     8 052 852 545      cache-references                                                      
       808 407 569      cache-misses                     #   10,04% of all cache refs         
   <not supported>      bus-cycles                                                            

       7,458061318 seconds time elapsed

      40,020366000 seconds user
       6,152590000 seconds sys

But could be so much better
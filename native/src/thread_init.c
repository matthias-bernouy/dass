#include "shared.h"
#include "heap.h"
#include <sys/mman.h>
#include "system.h"
#include "document.h"
    
void thread_init(){
    thread_rng_seed = random();
}
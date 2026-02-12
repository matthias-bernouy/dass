#include "shared.h"
#include "heap.h"
#include <sys/mman.h>
#include "system.h"
#include "document.h"
    
__attribute__((constructor))
void global_auto_init(){
    memset(heap, 0, BASE_HEAP_SIZE);
}
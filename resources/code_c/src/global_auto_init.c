#include "shared.h"
#include "heap.h"
#include <sys/mman.h>
#include "system.h"
#include "document.h"
    
__attribute__((constructor))
void global_auto_init(){
    // heap = mmap(NULL, BASE_HEAP_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    memset(heap, 0, BASE_HEAP_SIZE);
}
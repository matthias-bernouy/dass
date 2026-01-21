// #include "../headers/shared_headers.h"

// // MAP CONSTANTS
// # define MAP_SIZE (1 << 16)
// # define MAP_MODULO_MASK ( MAP_SIZE - 1 )

// // RESOURCE CONSTANTS
// # define MAX_RESOURCES_IN_SINGLE_PARTITION (1 << 16)
// # define RESOURCE_MODULO_MASK ( MAX_RESOURCES_IN_SINGLE_PARTITION - 1)
// # define RESOURCE_STATUS_FREE_MASK ( 1 << 1 )
// # define RESOURCE_STATUS_BUSY_MASK ( 1 << 2 )
// # define RESOURCE_STATUS_RESERVED_MASK ( 1 << 3 )
// # define RESOURCE_STATUS_DELETED_MASK ( 1 << 4 )

// // PARTITION CONSTANTS
// # define MAX_PARTITION (1ULL << 32)
// # define DEFAULT_RAW_DATA_SIZE (1 << 27) // in bytes equals to 134.xx MB
// # define PARTITION_STATUS_TRANSFER_MASK (1 << 1)
// # define PARTITION_STATUS_COMPACTING_MASK (1 << 2)
// # define PARTITION_STATUS_READY_MASK (1 << 3)
// # define PARTITION_STATUS_GROWING_MASK (1 << 4)

// typedef struct {
//     uint64_t salt;
//     uint32_t partition_id;
//     uint16_t entity_id;
//     uint16_t _padding;
// } ResourceID;

// typedef struct {
//     uint64_t salt;
//     uint64_t timestamp; // set before get atomic status, to, if a worker crash, when the normalizer (GC) is running, he change the status

//     uint32_t offset; 
//     uint32_t allocated_size;
//     uint32_t current_size;

//     uint32_t transaction_id;
//     uint32_t checksum; // headers + data but without status, status should verify with masks, if 1010 000 -> corruption

//     _Atomic uint32_t status; // 2: Free 4: Busy 8: Reserved 16: Deleted
// } ResourceHeader;

// typedef struct {
//     _Atomic uint32_t status; // 2 = in transfer, 4 = compacting, 8 = ready, 16 = growing

//     _Atomic uint32_t entities_counter;

//     uint32_t data_capacity;
//     _Atomic uint32_t data_cursor;

//     ResourceHeader headers[MAX_RESOURCES_IN_SINGLE_PARTITION];

//     uint8_t raw_data[]; // To manage variable data size
// } Partition;

// typedef struct {
//     uint32_t partition_id;
//     uint32_t _padding;
//     Partition* ptr;        // Le pointeur vers les données
// } MapPartitionEntry;

// static MapPartitionEntry partition_map[MAP_SIZE];

// uint32_t partition_exists(uint32_t partition_id){
//     MapPartitionEntry* p = &partition_map[partition_id & MAP_MODULO_MASK];
//     if (p->ptr != NULL) return 0xFFFFFFFF;
//     else return 0x00000000;
// }

// void create_partition(uint32_t partition_id, uint32_t raw_data_size){
//     MapPartitionEntry* p = &partition_map[partition_id & MAP_MODULO_MASK];
//     if ( p->ptr == NULL ) {
//         size_t total_size = sizeof(Partition) + raw_data_size;
//         Partition* new_partition = (Partition*)aligned_alloc(64, total_size);
//         new_partition->data_capacity = raw_data_size;
//         new_partition->data_cursor = 0;
//         new_partition->entities_counter = 0;
//         new_partition->status = PARTITION_STATUS_READY_MASK;
//         for (uint32_t i = 0; i < MAX_RESOURCES_IN_SINGLE_PARTITION; i++) {
//             atomic_store_explicit(&new_partition->headers[i].status, RESOURCE_STATUS_FREE_MASK, memory_order_release);
//         }
//         p->partition_id = partition_id;
//         p->ptr = new_partition;
//     }
// }

// uint32_t calculate_resource_checksum(ResourceHeader* h, Partition* p) {
//     size_t header_stable_size = offsetof(ResourceHeader, checksum); 
//     uint32_t h_hash = xxh32_fixed(h, header_stable_size, (uint32_t)h->salt);
//     void* data_ptr = &p->raw_data[h->offset];
//     uint32_t final_hash = xxh32_fixed(data_ptr, h->current_size, h_hash);
//     return final_hash;
// }
#include "errors.h"

bool is_id_error(uint64_t id_res){
    return id_res < 1000;
}
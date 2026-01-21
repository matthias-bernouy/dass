#include "../headers/transaction_headers.h"

FnResponse register_handler(uint32_t index, ActionHandler handler)
{
    if (index >= TRANSACTION_MAX_HANDLER) {
        return RES_SYS_ERR_FULL;
    }
    handler_map[index].perform = handler;
    return RES_STANDARD_SUCCESS;
}
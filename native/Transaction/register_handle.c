#include "../headers/transaction_headers.h"

void register_handler(uint32_t index, ActionHandler handler)
{
    if (index >= TRANSACTION_MAX_HANDLER) {
        return;
    }
    handler_map[index].perform = handler;
}
#include "lockable.h"

bool equals_lockable(MetadataConcurrencyElement metadata1, MetadataConcurrencyElement metadata2)
{
    return metadata2.status == metadata1.status && metadata2.cursor == metadata1.cursor;
}
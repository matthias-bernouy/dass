#include "shared.h"
#include "document.h"

static const uint16_t SCHEMA_ID   = 0;//Generated
static const uint16_t DEF_ZONE_ID = 0;//Generated

typedef struct {
	uint64_t last_tx_id;
	DocumentComposedID _id;
{{STRUCTS}}
	uint8_t  raw[];
} Template;

Template* create_template({{CREATE_PARAMS}} uint64_t tx_id) {

	uint64_t cpt_raw = 0;
	const uint64_t create_raw_size = 0;//Generated
	const uint64_t total_size = sizeof(Template) + create_raw_size;
	Template* element = calloc_heap(total_size);

	element->_id = thread_generate_id_document(DEF_ZONE_ID, SCHEMA_ID);

{{CREATE_OBJECT}}

{{CREATE_RAW_DATA}}

	FnResponse res = thread_create_document(element->_id, (void*)element, total_size, tx_id);

	return element;
}

static void id_to_hex(DocumentComposedID* id, char* out) {
    char hex_id[33];
    sprintf(hex_id, "%016llx%04x%08x%04x", 
            (unsigned long long)id->salt, 
            (unsigned int)id->zone, 
            (unsigned int)id->shard, 
            (unsigned int)id->id);
    strcpy(out, hex_id);
}

uint32_t get_template_as_json(DocumentComposedID* _id, char* json_output) {
	Template* element = get_document(_id, SCHEMA_ID);
	if (element == NULL) return 0;

	char uuid_hex[33];
    id_to_hex(&element->_id, uuid_hex);

	json_output[0] = '{';
	memcpy(json_output + 1, "\"_id\":\"", 7);
	memcpy(json_output + 8, uuid_hex, 32);
	json_output[40] = '"';

	uint64_t raw_cpt = 0;
	uint64_t json_cpt = 41;

	memcpy(json_output + json_cpt++, ",", 1);

//{{GET_AS_JSON}}

	json_output[json_cpt++] = '}';



	return json_cpt++;
}

void* get_template(DocumentComposedID* _id) {
    return get_document(_id, SCHEMA_ID);
}

FnResponse delete_template(DocumentComposedID* _id, uint64_t tx_id){
	Template* element = get_document(_id, SCHEMA_ID);
	if (element == NULL) return false;
	return delete_document(_id, tx_id, element->last_tx_id);
}

FnResponse update_template({{UPDATE_PARAMS}} DocumentComposedID* _id, uint64_t tx_id) {

	Template* initial_element = get_document(_id, SCHEMA_ID);
	if (initial_element == NULL) return false;

    uint64_t cpt_raw = 0;
    const uint64_t update_raw_size = 0;//Generated
    const uint64_t total_size = sizeof(Template) + update_raw_size;
    Template* element = calloc_heap(total_size);

{{UPDATE_OBJECT}}

{{UPDATE_RAW_DATA}}

	return update_document(_id, element, total_size, tx_id, initial_element->last_tx_id);
}
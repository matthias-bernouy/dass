NAME = generated.so

SRC_DIR = node_modules/.dass-generated/c
HEADERS_DIR = node_modules/.dass-generated/c/base/headers

PRE_BUILD_DIR = node_modules/.dass-generated/c_prebuild
BUILD_DIR = node_modules/.dass-generated/c_compiled

SOURCES = $(shell find $(SRC_DIR) -name "*.c")

PRE_BUILD_O = $(patsubst $(SRC_DIR)/%.c, $(PRE_BUILD_DIR)/%.o, $(SOURCES))

CC = gcc
INCLUDES = -I$(shell pwd)/$(HEADERS_DIR) -I$(shell pwd)/$(SRC_DIR)
BASE_CFLAGS = -Wall -Wextra -fPIC $(INCLUDES)

all: prod

prod: CFLAGS = $(BASE_CFLAGS) -O3 -march=native -DNDEBUG
prod: build

dev: CFLAGS = $(BASE_CFLAGS) -g3 -Og -DDEV_MODE -DDEBUG
dev: build

build: $(PRE_BUILD_O)
	@mkdir -p $(BUILD_DIR)
	$(CC) -shared $(CFLAGS) $(PRE_BUILD_O) -o $(BUILD_DIR)/$(NAME)
	@echo "✅ Shared library mise à jour : $(BUILD_DIR)/$(NAME)"

$(PRE_BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@
	@echo "Compilé : $<"

clean:
	rm -rf $(OBJ_DIR) $(BUILD_DIR)
	@echo "🧹 Clean terminé"

re: clean all

.PHONY: all clean re dev prod build
NAME = generated.so

SRC_DIR = native/src
HEADERS_DIR = native/headers
BUILD_DIR = src/lib/native_bridge/build

SOURCES = $(shell find $(SRC_DIR) -name "*.c")

CC = gcc
INCLUDES = -I$(shell pwd)/$(HEADERS_DIR) -I$(shell pwd)/$(SRC_DIR)
BASE_CFLAGS = -Wall -Wextra -fPIC -shared $(INCLUDES)

all: prod

prod: CFLAGS = $(BASE_CFLAGS) -O3 -march=native -DNDEBUG
prod: build

dev: CFLAGS = $(BASE_CFLAGS) -g3 -Og -DDEV_MODE -DDEBUG
dev: build

build: $(SOURCES)
	@mkdir -p $(BUILD_DIR)
	@echo "🔨 Build en cours avec FLAGS: $(CFLAGS)"
	$(CC) $(CFLAGS) $(SOURCES) -o $(BUILD_DIR)/$(NAME) -latomic

clean:
	rm -rf $(BUILD_DIR)
	@echo "🧹 Clean terminé"

re: clean all

.PHONY: all clean re dev prod build
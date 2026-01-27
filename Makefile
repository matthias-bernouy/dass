# Nom de la bibliothèque finale
NAME = libnative.so

# Répertoires
SRC_DIR = native/src
HEADERS_DIR = native/headers
BUILD_DIR = src/lib/native_bridge/build

# 1. Lister tous les fichiers .c
SOURCES = $(shell find $(SRC_DIR) -name "*.c")

# Options de compilation
CC = gcc
# -fPIC est obligatoire pour les .so
# -shared indique qu'on veut une bibliothèque partagée
INCLUDES = -I$(shell pwd)/$(HEADERS_DIR) -I$(shell pwd)/$(SRC_DIR)
CFLAGS = -O3 -Wall -Wextra -fPIC -shared -march=native $(INCLUDES)

# Règle par défaut
all: $(BUILD_DIR)/$(NAME)

# Règle directe : .c -> .so (sans .o intermédiaires)
$(BUILD_DIR)/$(NAME): $(SOURCES)
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(SOURCES) -o $@

clean:
	rm -rf $(BUILD_DIR)
	@echo "🧹 Clean terminé"

re: clean all

.PHONY: all clean re
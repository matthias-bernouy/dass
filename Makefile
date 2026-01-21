# Nom de la bibliothèque finale
NAME = libnative.so

# Répertoires
SRC_DIR = native
BUILD_DIR = build

# 1. Lister tous les fichiers .c
SOURCES = $(shell find $(SRC_DIR) -name "*.c")

# Options de compilation
CC = gcc
# -fPIC est obligatoire pour les .so
# -shared indique qu'on veut une bibliothèque partagée
CFLAGS = -O3 -Wall -Wextra -fPIC -shared -march=native -I$(SRC_DIR)

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
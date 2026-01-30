
# 1. native/
This folder includes the C project.

## 1.1 native/??parts??/
For each parts, a folder is assigned.
A file include only one function under this folder.
Example : 
	-> tx/commit_tx.c
	-> tx/create_tx.c

## 1.2 native/headers/
For each parts, a header is created.
Exemple : 
	-> headers/tx.h
	-> headers/idmap.h
Additionnal files :
	-> headers/responses.h

## 1.3 Folder names
Folder should be named using snake_case

## 1.4 File names
File names should be equal to the unique function in the file.

## 1.5 Function names
The function should be named using snake_case
The function should include the parts.
Ex :
	NO  commit()
	YES commit_tx()

# 1.6 Variables names
Variables should be named using snake_case

# 2. src/

## 2.1 src/lib/native_bridge
The folder contains : 
	-> The native build .so
	-> Interface in typescript to interacting with it


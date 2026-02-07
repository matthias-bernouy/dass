#!/usr/bin/env bun

console.log("Hello world from CLI! This is where you can start your build, dev, run, test commands.");

// Get args
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log("No command provided. Use 'dev' to start the development server.");
    process.exit(0);
}

if (args[0] === "dev"){
    console.log("Starting development server...");
}
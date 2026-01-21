import { dlopen, FFIType, ptr } from "bun:ffi";

const NB_OPERATIONS = 100_000_000;
const numbers = new Uint32Array(NB_OPERATIONS);

// Utilitaire pour remplir le tableau de nombres aléatoires
const resetArray = () => {
    for (let i = 0; i < NB_OPERATIONS; i++) {
        numbers[i] = Math.floor(Math.random() * 4500000);
    }
};

// Chargement de la lib C
const lib = dlopen("./libbench.so", {
    bench_and: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
    bench_modulo: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
    bench_shift: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
    bench_div: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
    bench_add: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
    bench_mul: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.void },
});

function runTest(label, cbC, cbJS) {
    console.log(`\n=== TEST: ${label} ===`);

    // Test C
    resetArray();
    const startC = performance.now();
    cbC();
    const endC = performance.now();
    const timeC = endC - startC;

    // Test JS
    resetArray();
    const startJS = performance.now();
    cbJS();
    const endJS = performance.now();
    const timeJS = endJS - startJS;

    console.log(`C  : ${timeC.toFixed(2)} ms`);
    console.log(`JS : ${timeJS.toFixed(2)} ms`);
    console.log(`Ratio JS/C : ${(timeJS / timeC).toFixed(2)}x`);
}

console.log(`Démarrage du benchmark sur ${NB_OPERATIONS.toLocaleString()} éléments...`);

// 1. Bitwise AND vs Modulo
runTest("Bitwise AND (& 255)", 
    () => lib.symbols.bench_and(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] &= 255; }
);

runTest("Modulo (% 256)", 
    () => lib.symbols.bench_modulo(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] %= 256; }
);

// 2. Bitshift vs Division
runTest("Bitshift (>> 1)", 
    () => lib.symbols.bench_shift(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] >>= 1; }
);

runTest("Division (/ 2)", 
    () => lib.symbols.bench_div(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] = (numbers[i] / 2) | 0; } // | 0 pour rester en entier
);

// 3. Addition vs Multiplication
runTest("Addition (+ 10)", 
    () => lib.symbols.bench_add(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] += 10; }
);

runTest("Multiplication (* 10)", 
    () => lib.symbols.bench_mul(ptr(numbers), numbers.length),
    () => { for (let i = 0; i < NB_OPERATIONS; i++) numbers[i] *= 10; }
);
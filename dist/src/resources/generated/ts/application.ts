const nbWorkers = 1;
const workers: Worker[] = [];

function create_worker(i: number){
    if (workers[i]) {
        workers[i].terminate();
    }

    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        smol: false,
    });

    workers[i] = worker;
}

export function AppRunner(){

    for (let i = 0; i < nbWorkers; i++) {
        create_worker(i);
    }

    function stop () {
        for (let i = 0; i < nbWorkers; i++) {
            workers[i]?.terminate();
        }
    }

    return { stop }
}
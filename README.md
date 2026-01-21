# Why this package



## How to start

### Installation
```bash
bun add @befive/sharded-server
```

### How to use it
```typescript
import ShardedServer from sharded-server

// You can set process.env.PORT
// You can set process.env.SHARDS
const server = new ShardedServer({
    port: 3000, // default: 3000
    shards: "auto", // ou un nombre spécifique, default: auto
    routes: "auto" // default: auto (./routes)
});

server.start()
```

### How to add routes
In folder routes or process.env.ROUTES

export default one of the following : GET, POST, PATCH, OPTION, DELETE
and the function identifier(req: Request)

```typescript
export function identifier(req: Request){
    return req.queryParams.namespace;
}

export default function GET(req: Request){
    return new Response("Hello World");
}
```
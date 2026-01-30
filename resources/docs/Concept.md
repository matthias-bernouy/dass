# 🚀 DaaS: Decentralized Autonomous Storage Solution

DaaS is an ultra-high performance **In-Process** database designed for modern JavaScript applications (Bun). By eliminating traditional network layers, DaaS enables direct memory access via a native C bridge.

---

## 1. Why DaaS?

* **Zero Network Latency:** No TCP/HTTP requests to an external database. Your data resides directly within your application's memory space.
* **Zero Parsing:** Eliminates the CPU overhead of serialization/deserialization (JSON/BSON). Data is read directly in binary format.
* **Zero Configuration:** No credentials to manage, no external clusters to maintain. Your code *is* the database.

---

## 2. Technical Architecture

### 2.1 Sharding & Identifiers (112-bit)
The system uses structured addressing to ensure uniqueness and decentralized distribution:

| Component | Size | Description |
| :--- | :--- | :--- |
| **Salt** | 64 bits | Security and collision protection. |
| **Shard ID** | 32 bits | Supports up to **4.2 billion** shards. |
| **Document ID** | 16 bits | Maximum of **65,536** documents per shard. |



### 2.2 Native Performance
Unlike traditional JS solutions, DaaS delegates critical logic to the **C Engine**:
* **Business Constraints:** Validations (e.g., `balance > 0`) are pre-compiled in C.
* **Uniqueness:** Native index management (e.g., `unique email`).
* **Aggregations:** Complex calculations (e.g., transaction sums) are performed as close to the RAM as possible.

---

## 3. Developer Experience (DX)

### Prerequisites
* **Runtime:** Bun
* **Tools:** A C compiler (GCC/Clang)

### Development Workflow

1.  **Initialization**
    ```bash
    bun dass start
    ```

2.  **Schema Definition**
    Define your models with integrated atomic business rules.
    
3.  **HTTP Entry Points**
    Configure your routes with automatics processes based on your schemas.
	For your complexe business logic, you code Javascript as you want

4.  **Build & Optimization**
    ```bash
    dass build
    ```
    This command compiles your business logic into machine code (`.so`) for uncompromising execution speed.

---

## 4. Scalability

DaaS is designed to leverage 100% of your infrastructure:
* **Multi-threading:** On a 32-core server, 32 threads work in parallel on shared memory.
* **Decentralization:** The Shard ID system allows you to transparently scale your database across multiple physical servers.
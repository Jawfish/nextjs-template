# PRD: LLM-Powered Application with Sandboxed Execution

**Working Title**: `engi`

**Status**: Draft

**Last Updated**: 2025-11-28

---

## Overview

A Python application for LLM-powered interactions using pydantic-ai, with Firecracker-based sandboxed code execution. Built on mature Python tooling rather than reimplementing solved problems.

---

## Stack

| Layer | Technology | Why |
|-------|------------|-----|
| LLM Abstraction | [pydantic-ai](https://ai.pydantic.dev/) | Mature, typed, handles structured output/tools/streaming |
| Data Validation | [Pydantic](https://docs.pydantic.dev/) | Industry standard for Python data validation |
| HTTP API | [Litestar](https://docs.litestar.dev/) | Performant ASGI framework with built-in OpenAPI, DI |
| HTTP Client | httpx | Async-first, modern Python HTTP |
| Code Execution | Firecracker microVMs | Hardware-level isolation, sub-second latency |

---

## Goals

1. Provide LLM-powered interactions with structured output and tool calling via pydantic-ai
2. Execute user-provided code safely in Firecracker microVMs
3. Support streaming responses for real-time UI updates
4. Expose a clean HTTP API for frontend consumption

## Non-Goals (v1)

- Custom LLM abstraction layer (use pydantic-ai)
- RAG / embedding / vector store integration
- Prompt templating system
- Conversation memory persistence (caller's responsibility)

---

## Core Concepts

### pydantic-ai Agents

pydantic-ai provides the LLM abstraction layer. Agents are the core primitive:

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class CodeResponse(BaseModel):
    explanation: str
    code: str
    language: str

agent = Agent(
    "openai:gpt-4o",
    output_type=CodeResponse,
    system_prompt="You are a helpful coding assistant.",
)

result = await agent.run("Write a function to parse CSV")
print(result.output.code)  # Guaranteed to be CodeResponse
```

### Structured Output

pydantic-ai uses Pydantic models to constrain and validate LLM responses. The response is guaranteed to match the schema or raise a validation error.

```python
from pydantic import BaseModel, Field

class AnalysisResult(BaseModel):
    summary: str = Field(description="Brief summary of the analysis")
    confidence: float = Field(ge=0, le=1, description="Confidence score")
    findings: list[str] = Field(description="Key findings")
```

### Tool Calling

Tools are defined with the `@agent.tool` decorator. pydantic-ai automatically generates JSON schemas from function signatures and docstrings:

```python
from pydantic_ai import Agent, RunContext

agent = Agent("openai:gpt-4o")

@agent.tool
async def execute_code(ctx: RunContext, language: str, code: str) -> str:
    """Execute code in a sandboxed environment.

    Args:
        language: Programming language (python, javascript, go, bash)
        code: Code to execute
    """
    result = await sandbox.execute(language, code)
    return f"Exit code: {result.exit_code}\nOutput: {result.stdout}"
```

### Streaming

pydantic-ai supports streaming structured output with immediate validation:

```python
async with agent.run_stream("Analyze this data") as result:
    async for chunk in result.stream_output():
        # Each chunk is a partial AnalysisResult
        print(chunk)
```

### Dependency Injection

Type-safe dependencies via `RunContext`:

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext

@dataclass
class Dependencies:
    user_id: str
    sandbox: SandboxClient

agent = Agent("openai:gpt-4o", deps_type=Dependencies)

@agent.tool
async def get_user_files(ctx: RunContext[Dependencies]) -> list[str]:
    """Get files in user's workspace."""
    return await ctx.deps.sandbox.list_files(ctx.deps.user_id)
```

---

## Provider Support

pydantic-ai supports all major providers out of the box:

| Provider | Status | Notes |
|----------|--------|-------|
| OpenAI | ✅ | Native structured output via `response_format` |
| Anthropic | ✅ | Tool calling for structured output |
| Google Gemini | ✅ | Full support |
| Ollama | ✅ | OpenAI-compatible API |
| Mistral | ✅ | Full support |
| Groq | ✅ | Fast inference |

Switching providers is a config change:

```python
# Development
agent = Agent("ollama:llama3.2")

# Production
agent = Agent("anthropic:claude-sonnet-4-20250514")
```

---

## HTTP API (Litestar)

Litestar provides the HTTP layer with built-in features:

- Dependency injection
- OpenAPI schema generation (Swagger, ReDoc, Scalar)
- Request/response validation via Pydantic
- Structured logging (structlog)
- SQLAlchemy integration

```python
from litestar import Litestar, post
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str

@post("/chat")
async def chat(data: ChatRequest) -> ChatResponse:
    result = await agent.run(data.message)
    return ChatResponse(
        response=result.output,
        conversation_id=data.conversation_id or generate_id(),
    )

app = Litestar(route_handlers=[chat])
```

---

## Sandboxed Code Execution with Firecracker

Self-hosted Firecracker microVMs provide hardware-level isolation with sub-second latency via a pre-warmed pool architecture. Each execution gets a fresh VM that is destroyed after use — no state leakage between runs.

### Why Firecracker

- **Fast boot**: <125ms cold start, ~5MB memory overhead per VM
- **Strong isolation**: KVM-based hardware virtualization, not just container namespaces
- **High density**: Up to 150 microVM creations per second per host
- **Minimal attack surface**: Only 5 emulated devices
- **Production proven**: Powers AWS Lambda and Fargate
- **Open source**: Apache 2.0, no vendor lock-in

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Pool Manager                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Warm VM     │  │ Warm VM     │  │ Warm VM     │  ... (N)     │
│  │ (ready)     │  │ (ready)     │  │ (ready)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │ In-Use VM   │     │ In-Use VM   │     │ In-Use VM   │        │
│  │ (executing) │     │ (executing) │     │ (executing) │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│         │                                                        │
│         ▼                                                        │
│      [Destroy]  ← VMs are NEVER returned to pool                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Replenisher (background)                                 │    │
│  │ - Monitors pool size                                     │    │
│  │ - Boots new VMs to maintain target capacity              │    │
│  │ - Pre-installs language runtimes, common packages        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### VM Lifecycle

```
1. BOOT (background)
   - Firecracker boots microVM from base rootfs snapshot
   - Runtime initialized (Python, Node, Go, etc.)
   - VM enters pool in "ready" state
   - Boot time: ~125ms (happens async, not on request path)

2. CLAIM (on request)
   - Request arrives, Pool Manager claims a ready VM
   - VM marked as "in-use", removed from available pool
   - If pool empty: either wait for boot or reject (configurable)
   - Claim time: <1ms

3. EXECUTE
   - Code copied into VM via virtio-vsock or API
   - Execution runs with resource limits (CPU, memory, time)
   - Stdout/stderr captured, optionally streamed
   - Files written to designated output directory captured

4. DESTROY (always, never reuse)
   - VM terminated immediately after execution completes
   - All state destroyed: memory, filesystem, network
   - No possibility of data leakage to next execution
   - Destruction time: ~10ms

5. REPLENISH (background)
   - Pool Manager detects pool size below target
   - Boots new VMs to restore capacity
   - Runs continuously, independent of request path
```

### Isolation Guarantees

| Threat | Mitigation |
|--------|------------|
| Code from run A accessing data from run B | VMs destroyed after each use, never reused |
| Malicious code escaping to host | KVM hardware virtualization boundary |
| Resource exhaustion (fork bomb, OOM) | Cgroups limits enforced by Firecracker |
| Network attacks on internal services | No network by default, or isolated network namespace |
| Long-running code blocking resources | Wall-clock timeout, VM forcibly killed |
| Filesystem escape | Minimal rootfs, no host mounts, read-only base image |

### Pool Configuration

```python
from dataclasses import dataclass
from enum import Enum

class EmptyPoolPolicy(Enum):
    WAIT = "wait"           # Wait for a VM to become available
    BOOT_SYNC = "boot_sync" # Boot a new VM synchronously (adds ~125ms)
    REJECT = "reject"       # Return error immediately

class NetworkMode(Enum):
    NONE = "none"
    ISOLATED = "isolated"
    RESTRICTED = "restricted"

@dataclass
class ResourceLimits:
    vcpus: int = 1
    memory_mb: int = 512
    disk_mb: int = 1024
    timeout_seconds: int = 30
    network_mode: NetworkMode = NetworkMode.NONE

@dataclass
class PoolConfig:
    target_pool_size: int = 10
    max_vms: int = 50
    language_pools: dict[str, int] | None = None  # e.g., {"python": 10, "node": 5}
    empty_pool_policy: EmptyPoolPolicy = EmptyPoolPolicy.WAIT
    claim_timeout_seconds: float = 5.0
    rootfs_path: str = "/var/lib/firecracker/rootfs.ext4"
    kernel_path: str = "/var/lib/firecracker/vmlinux"
    default_limits: ResourceLimits = ResourceLimits()
```

### Integration with pydantic-ai

The sandbox integrates as a tool:

```python
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext

class ExecuteCodeArgs(BaseModel):
    language: str  # python, javascript, go, bash
    code: str
    timeout_seconds: int = 30

class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    error: str | None = None  # Timeout, OOM, etc.

agent = Agent("openai:gpt-4o", deps_type=SandboxClient)

@agent.tool
async def execute_code(
    ctx: RunContext[SandboxClient],
    language: str,
    code: str,
    timeout_seconds: int = 30,
) -> ExecutionResult:
    """Execute code in a sandboxed environment.

    Args:
        language: Programming language (python, javascript, go, bash)
        code: Code to execute
        timeout_seconds: Maximum execution time
    """
    return await ctx.deps.execute(language, code, timeout_seconds)
```

### Execution Loop

When the LLM calls `execute_code`:

1. pydantic-ai invokes the registered tool function
2. Sandbox executes code, returns result
3. pydantic-ai appends tool result to conversation
4. LLM sees output, can iterate or respond to user

```
User: "Write a function to parse CSV and show me it works"
    ↓
LLM: calls execute_code(language="python", code="def parse_csv...")
    ↓
Sandbox: returns {stdout: "...", exit_code: 0}
    ↓
LLM: "Here's the function. I ran it and [explains output]"
```

### Streaming Execution Output

For long-running code, stream stdout/stderr back to the UI in real-time:

```python
from collections.abc import AsyncIterator
from dataclasses import dataclass

@dataclass
class OutputChunk:
    stream: str  # "stdout" or "stderr"
    data: str

@dataclass
class StreamingExecutionResult:
    output: AsyncIterator[OutputChunk]
    final_result: asyncio.Future[ExecutionResult]
```

### File Artifacts

Support file outputs beyond stdout:

```python
class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    files: dict[str, bytes] | None = None  # Files written to output dir
    error: str | None = None
```

This enables workflows like "generate a chart" where the code writes an image file.

### Host Requirements

Firecracker requires:

- **Linux host** with kernel 4.14+ (5.x recommended)
- **KVM support** (`/dev/kvm` must exist and be accessible)
- **Bare metal or nested virtualization** — EC2 `.metal` instances, or cloud VMs with nested virt enabled
- **Adequate resources** — plan for: (pool_size × memory_per_vm) + overhead

Recommended instance types:
- AWS: `c5.metal`, `m5.metal`, `r5.metal`
- GCP: `n2-standard-*` with nested virtualization enabled
- Self-hosted: Any modern x86_64 or ARM64 server with VT-x/AMD-V

### Security Hardening

```
┌─────────────────────────────────────────────────────────┐
│ Host OS                                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Jailer (Firecracker's built-in sandbox)           │  │
│  │  - chroot to isolated directory                   │  │
│  │  - seccomp-bpf syscall filtering                  │  │
│  │  - cgroups for resource limits                    │  │
│  │  - dropped privileges (non-root)                  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ Firecracker VMM                             │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │ MicroVM (KVM)                         │  │  │  │
│  │  │  │  - Isolated kernel                    │  │  │  │
│  │  │  │  - Minimal device model               │  │  │  │
│  │  │  │  - No host filesystem access          │  │  │  │
│  │  │  │  ┌─────────────────────────────────┐  │  │  │  │
│  │  │  │  │ User code execution             │  │  │  │  │
│  │  │  │  └─────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Additional hardening:
- Run Firecracker hosts in isolated network segment
- No SSH access to hosts in production
- Immutable host OS (e.g., Flatcar, Bottlerocket)
- Regular security patching of kernel and Firecracker

---

## Interactive Sandbox Environments

Beyond ephemeral code execution, Firecracker microVMs can provide full interactive Linux environments where users get their own sandboxed system to explore, build, and experiment.

### Use Cases

| Use Case | Description |
|----------|-------------|
| Interactive coding environment | Terminal + editor, user installs packages, runs servers |
| Per-user dev sandboxes | Pre-configured environments for a specific stack |
| "Try our product" sandboxes | Let users experiment without signup/install |
| Training/workshop environments | Consistent environment for all participants |
| CTF/security challenges | Isolated boxes for offensive security practice |
| Customer support debugging | Reproduce customer issues in isolated env |

### Architecture Differences from Ephemeral Execution

```
Ephemeral (code execution):
  Request → Claim VM → Execute → Capture output → Destroy VM → Response
  Lifecycle: seconds

Interactive (user environment):
  Connect → Boot or Resume VM → Attach terminal → [User session] → Detach → Suspend or Destroy
  Lifecycle: minutes to hours
```

Key differences:

| Aspect | Ephemeral | Interactive |
|--------|-----------|-------------|
| Lifecycle | Seconds | Minutes to hours |
| Input | Code string | Terminal I/O stream |
| Output | Captured stdout/files | Real-time bidirectional |
| State | Destroyed after each run | May persist across sessions |
| Resources | Minimal (256MB-512MB) | Larger (1GB-8GB+) |
| Network | Usually disabled | Often enabled (with restrictions) |

### Session Management

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

class SessionState(Enum):
    BOOTING = "booting"
    RUNNING = "running"           # VM running, terminal attached or detachable
    SUSPENDED = "suspended"       # VM paused, can resume quickly
    HIBERNATED = "hibernated"     # VM stopped, state saved to disk
    TERMINATED = "terminated"     # VM destroyed, no recovery

class PersistenceMode(Enum):
    NONE = "none"                 # Destroy on disconnect
    SESSION = "session"           # Keep alive for idle_timeout
    SNAPSHOT = "snapshot"         # Save state, restore on reconnect

@dataclass
class SessionConfig:
    template: str                           # e.g., "python-dev", "node-fullstack"
    vcpus: int = 2
    memory_mb: int = 2048
    disk_gb: int = 10
    idle_timeout: timedelta = timedelta(minutes=30)
    max_duration: timedelta = timedelta(hours=8)
    persistence: PersistenceMode = PersistenceMode.SESSION
    network_mode: NetworkMode = NetworkMode.ISOLATED
    allowed_ports: list[int] | None = None  # For inbound connections (dev server)

@dataclass
class InteractiveSession:
    id: str
    user_id: str
    vm_id: str
    state: SessionState
    created_at: datetime
    last_active: datetime
    config: SessionConfig
```

### Terminal Attachment

Users interact via a terminal, typically over WebSocket:

```
┌──────────────┐     WebSocket      ┌──────────────┐     virtio-vsock    ┌──────────────┐
│   Browser    │ ◄────────────────► │   API        │ ◄─────────────────► │   MicroVM    │
│   (xterm.js) │                    │   Server     │                     │   (bash)     │
└──────────────┘                    └──────────────┘                     └──────────────┘
```

Components:
- **Frontend**: xterm.js or similar terminal emulator in browser
- **API server**: Bridges WebSocket to VM, handles auth, session management
- **virtio-vsock**: Firecracker's mechanism for host↔guest communication
- **Guest agent**: Small daemon in VM that spawns shell, handles resize, etc.

```python
from typing import Protocol
import asyncio

class TerminalBridge(Protocol):
    async def attach(self, session_id: str, conn: asyncio.StreamReader) -> None:
        """Connect a terminal stream to the VM."""
        ...

    async def resize(self, session_id: str, cols: int, rows: int) -> None:
        """Send window size change to VM."""
        ...

    async def detach(self, session_id: str) -> None:
        """Disconnect terminal but keep VM running."""
        ...
```

### Persistence Strategies

**Option 1: Ephemeral (no persistence)**
- VM destroyed on disconnect or idle timeout
- Simplest, no storage management
- User starts fresh each time

**Option 2: Overlay filesystem**
- Base rootfs is read-only, shared across all VMs
- User changes written to per-user overlay (OverlayFS)
- On reconnect: boot fresh VM, mount user's overlay
- Storage: only delta from base image

```
┌─────────────────────────────┐
│     User's overlay (rw)     │  ← Per-user, persisted
├─────────────────────────────┤
│     Base rootfs (ro)        │  ← Shared, immutable
└─────────────────────────────┘
```

**Option 3: Full VM snapshots**
- Snapshot entire VM state (memory + disk) on suspend
- Restore exact state on resume
- Highest fidelity, highest storage cost
- Good for: long-running sessions, complex state

**Option 4: Workspace-only persistence**
- Only persist `/home/user` or `/workspace` directory
- Sync to object storage (S3, GCS) on disconnect
- Restore on reconnect
- Balance of fidelity and cost

### Exposed Ports / Dev Servers

Users often want to run web servers and access them from browser:

```python
@dataclass
class PortMapping:
    vm_port: int          # Port inside the VM (e.g., 3000)
    protocol: str         # "http", "https", "tcp"
    subdomain: str | None # Optional: "myapp" → myapp.sandbox.example.com

@dataclass
class ExposedPort:
    mapping: PortMapping
    public_url: str       # e.g., "https://abc123-3000.sandbox.example.com"
    status: str           # "listening", "not_listening"
```

Implementation options:
- **Subdomain per port**: `{session_id}-{port}.sandbox.example.com`
- **Path-based routing**: `sandbox.example.com/{session_id}/{port}/`
- **Reverse proxy**: Nginx/Envoy routes to appropriate VM based on hostname

Security considerations:
- HTTPS termination at proxy
- Authentication (verify user owns session)
- Rate limiting
- Timeout idle connections

### Resource Limits and Fair Use

Interactive environments need tighter controls than ephemeral execution:

```python
@dataclass
class InteractiveLimits:
    # Compute
    max_vcpus: int = 4
    max_memory_mb: int = 8192
    cpu_quota_percent: int = 50  # e.g., 50 = half a core max sustained

    # Storage
    max_disk_gb: int = 20
    max_inodes: int = 500000     # Prevent millions of tiny files

    # Network
    egress_bandwidth_bytes: int = 10_000_000  # 10 MB/s
    max_connections: int = 100

    # Time
    max_session_duration: timedelta = timedelta(hours=8)
    idle_timeout: timedelta = timedelta(minutes=30)

    # Per-user limits
    max_concurrent_sessions: int = 3
    max_sessions_per_day: int = 10
```

### Templates / Base Images

Pre-configured environments for common use cases:

```yaml
templates:
  python-dev:
    base: ubuntu-22.04
    packages:
      - python3.11
      - python3-pip
      - python3-venv
      - git
      - vim
    default_shell: /bin/bash
    working_dir: /workspace
    resources:
      vcpus: 2
      memory_mb: 2048
      disk_gb: 10

  node-fullstack:
    base: ubuntu-22.04
    packages:
      - nodejs
      - npm
      - yarn
      - git
      - postgresql-client
    default_shell: /bin/bash
    expose_ports: [3000, 5173, 8080]
    resources:
      vcpus: 2
      memory_mb: 4096
      disk_gb: 20

  blank-ubuntu:
    base: ubuntu-22.04
    packages: [git, curl, vim]
    default_shell: /bin/bash
    resources:
      vcpus: 1
      memory_mb: 1024
      disk_gb: 5
```

---

## Workspaces & Multi-Agent Workflows

Beyond single-file code execution, real-world tasks involve multi-file projects, composed services, and collaborative workflows where multiple agents or users interact with the same environment.

### Workspace Model

A workspace is a persistent, multi-file environment with optional services:

```python
from dataclasses import dataclass, field
from enum import Enum

class ServiceType(Enum):
    POSTGRES = "postgres"
    MYSQL = "mysql"
    REDIS = "redis"
    MONGODB = "mongodb"
    NGINX = "nginx"  # Static file serving / reverse proxy

@dataclass
class ServiceConfig:
    type: ServiceType
    version: str = "latest"
    environment: dict[str, str] = field(default_factory=dict)
    exposed: bool = False  # Expose to public URL?

@dataclass
class Workspace:
    id: str
    owner_id: str
    name: str
    files: dict[str, bytes]           # path -> content
    services: list[ServiceConfig]     # Composed services
    base_template: str = "blank-ubuntu"

    # Access control
    collaborators: list[str] = field(default_factory=list)
    public_preview: bool = False      # Allow unauthenticated preview access

    # State
    vm_id: str | None = None          # Active VM if running
    preview_urls: dict[str, str] = field(default_factory=dict)  # service -> URL
```

### File Operations

Agents can create, read, update, and delete files within a workspace:

```python
@agent.tool
async def write_file(
    ctx: RunContext[WorkspaceClient],
    path: str,
    content: str,
) -> str:
    """Write content to a file in the workspace.

    Args:
        path: File path relative to workspace root (e.g., "src/index.html")
        content: File content
    """
    await ctx.deps.write_file(path, content.encode())
    return f"Written {len(content)} bytes to {path}"

@agent.tool
async def read_file(
    ctx: RunContext[WorkspaceClient],
    path: str,
) -> str:
    """Read a file from the workspace.

    Args:
        path: File path relative to workspace root
    """
    content = await ctx.deps.read_file(path)
    return content.decode()

@agent.tool
async def list_files(
    ctx: RunContext[WorkspaceClient],
    path: str = ".",
) -> list[str]:
    """List files in a directory.

    Args:
        path: Directory path relative to workspace root
    """
    return await ctx.deps.list_files(path)
```

### Service Composition

Workspaces can include composed services (databases, web servers, etc.):

```python
@agent.tool
async def add_service(
    ctx: RunContext[WorkspaceClient],
    service_type: str,
    version: str = "latest",
) -> dict:
    """Add a service to the workspace (postgres, mysql, redis, nginx).

    Args:
        service_type: Type of service to add
        version: Service version
    """
    config = ServiceConfig(type=ServiceType(service_type), version=version)
    await ctx.deps.add_service(config)

    # Return connection info
    return {
        "type": service_type,
        "host": f"{service_type}.workspace.internal",
        "port": DEFAULT_PORTS[service_type],
        "connection_string": ctx.deps.get_connection_string(service_type),
    }

@agent.tool
async def run_sql(
    ctx: RunContext[WorkspaceClient],
    query: str,
    service: str = "postgres",
) -> list[dict]:
    """Execute SQL query against a database service.

    Args:
        query: SQL query to execute
        service: Database service name (postgres, mysql)
    """
    return await ctx.deps.execute_sql(service, query)
```

### Preview & Access

Expose workspace content via public URLs:

```python
@dataclass
class PreviewConfig:
    type: str                    # "static", "proxy", "websocket"
    root_path: str = "/"         # Path in workspace to serve
    port: int | None = None      # For proxy type, internal port to forward

@agent.tool
async def enable_preview(
    ctx: RunContext[WorkspaceClient],
    preview_type: str = "static",
    root_path: str = "/",
    port: int | None = None,
) -> str:
    """Enable public preview URL for the workspace.

    Args:
        preview_type: "static" (serve files), "proxy" (forward to running server)
        root_path: Path to serve (for static) or ignored (for proxy)
        port: Internal port to proxy (for proxy type)

    Returns:
        Public preview URL
    """
    config = PreviewConfig(type=preview_type, root_path=root_path, port=port)
    url = await ctx.deps.enable_preview(config)
    return url  # e.g., "https://abc123.preview.example.com"
```

Example: Serving a static website:
```
Agent creates files:
  - index.html
  - style.css
  - script.js

Agent calls: enable_preview(type="static", root_path="/")
Returns: "https://ws-abc123.preview.example.com"

User/reviewer can now view the website at that URL
```

### Multi-Agent Workflows

Workflows where multiple agents collaborate on the same workspace:

```python
from dataclasses import dataclass
from enum import Enum

class WorkflowStage(Enum):
    CREATION = "creation"
    REVIEW = "review"
    REVISION = "revision"
    APPROVED = "approved"
    REJECTED = "rejected"

@dataclass
class WorkflowState:
    workspace_id: str
    stage: WorkflowStage
    current_agent: str           # Agent role handling current stage
    history: list[WorkflowEvent] # Audit trail
    metadata: dict               # Stage-specific data (grades, feedback, etc.)

@dataclass
class WorkflowEvent:
    timestamp: datetime
    agent: str
    action: str
    details: dict

@dataclass
class ReviewResult:
    approved: bool
    grade: str | None            # e.g., "A", "B+", "needs work"
    feedback: str
    suggestions: list[str]
    modified_files: list[str]    # Files the reviewer changed
```

Example workflow: Website Creation & Review

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Creator    │───►│   Reviewer   │───►│   Approved   │              │
│  │    Agent     │    │    Agent     │    │   (final)    │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                   │                                           │
│         │                   │ needs work                                │
│         │                   ▼                                           │
│         │            ┌──────────────┐                                   │
│         └◄───────────│   Revision   │                                   │
│                      │   (creator)  │                                   │
│                      └──────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

Workflow tools:

```python
@agent.tool
async def submit_for_review(
    ctx: RunContext[WorkflowClient],
    notes: str = "",
) -> dict:
    """Submit the current workspace for review.

    Args:
        notes: Notes for the reviewer about what was done
    """
    return await ctx.deps.transition(
        to_stage=WorkflowStage.REVIEW,
        notes=notes,
    )

@agent.tool
async def submit_review(
    ctx: RunContext[WorkflowClient],
    approved: bool,
    grade: str | None = None,
    feedback: str = "",
    suggestions: list[str] | None = None,
) -> dict:
    """Submit review decision for a workspace.

    Args:
        approved: Whether the work is approved
        grade: Optional grade (A, B, C, etc.)
        feedback: Detailed feedback for the creator
        suggestions: Specific suggestions for improvement
    """
    next_stage = WorkflowStage.APPROVED if approved else WorkflowStage.REVISION
    return await ctx.deps.transition(
        to_stage=next_stage,
        review=ReviewResult(
            approved=approved,
            grade=grade,
            feedback=feedback,
            suggestions=suggestions or [],
            modified_files=[],
        ),
    )

@agent.tool
async def get_review_feedback(
    ctx: RunContext[WorkflowClient],
) -> ReviewResult | None:
    """Get the most recent review feedback (for revision stage)."""
    return await ctx.deps.get_latest_review()
```

### Example: Database Schema Review Workflow

```
1. Creator Agent:
   - Creates workspace with postgres service
   - Writes migration files (SQL)
   - Creates seed data
   - Runs migrations, verifies schema
   - Submits for review

2. Reviewer Agent:
   - Reads migration files
   - Inspects database schema (run_sql to check tables, indexes)
   - Evaluates: naming conventions, normalization, indexes, constraints
   - Runs test queries to verify performance
   - Either approves with grade, or returns with suggestions

3. If revision needed:
   - Creator receives feedback
   - Modifies migration files
   - Re-runs migrations
   - Re-submits for review
```

### Example: Full-Stack App Review Workflow

```
1. Creator Agent:
   - Creates workspace with postgres + nginx services
   - Writes: HTML, CSS, JS frontend
   - Writes: Python backend (or Node, etc.)
   - Sets up database schema
   - Enables preview URL
   - Submits for review

2. Reviewer Agent:
   - Views live preview URL (visual inspection)
   - Reads source code (read_file)
   - Evaluates:
     - Code quality (structure, naming, patterns)
     - Security (SQL injection, XSS, etc.)
     - Performance (queries, asset sizes)
     - Accessibility (semantic HTML, ARIA)
     - Responsiveness (CSS)
   - May modify files to demonstrate suggestions
   - Approves or returns with detailed feedback
```

### Workspace Templates for Workflows

Pre-configured workspace types for common scenarios:

```yaml
workflow_templates:
  static-website:
    files:
      - index.html
      - style.css
      - script.js
    services: []
    preview: static
    review_criteria:
      - HTML validity
      - CSS organization
      - JavaScript quality
      - Accessibility
      - Responsive design

  fullstack-app:
    files:
      - frontend/index.html
      - frontend/style.css
      - frontend/app.js
      - backend/main.py
      - backend/requirements.txt
      - docker-compose.yml
    services:
      - type: postgres
      - type: redis
    preview: proxy
    review_criteria:
      - Code organization
      - API design
      - Database schema
      - Security
      - Error handling

  database-schema:
    files:
      - migrations/001_initial.sql
      - migrations/002_indexes.sql
      - seed/data.sql
    services:
      - type: postgres
    review_criteria:
      - Normalization
      - Naming conventions
      - Index strategy
      - Constraints
      - Query performance
```

### Interactive Sandbox Implementation Phases

**Phase 1: Basic interactive shell**
- Single template (Ubuntu + common tools)
- WebSocket terminal attachment
- Ephemeral only (no persistence)
- No port exposure

**Phase 2: Persistence + templates**
- Multiple environment templates
- Overlay filesystem persistence
- Session suspend/resume

**Phase 3: Port exposure + collaboration**
- Dev server port exposure via subdomain
- Multiple terminals per session
- Session sharing (read-only or collaborative)

**Phase 4: Advanced**
- VS Code Server / JetBrains Gateway integration
- GPU passthrough for ML
- Custom user-provided templates
- Git integration (clone on start, push on disconnect)

---

## Implementation Phases

### Phase 1: Core LLM Integration

- pydantic-ai agent setup with structured output
- Basic HTTP API with Litestar
- Tool calling infrastructure

### Phase 2: Basic Sandbox

- Single-language support (Python)
- Fixed pool size
- Synchronous execution only
- Basic timeout handling

### Phase 3: Multi-language + Streaming

- Per-language pools
- Streaming stdout/stderr
- File artifact support
- Improved error handling

### Phase 4: Production Hardening

- Multi-host pool distribution
- Metrics and alerting
- Auto-scaling based on demand
- Blue-green rootfs deployments

---

## Success Criteria

1. LLM interactions work reliably with structured output
2. Code execution is isolated and secure
3. Streaming UI (chat + live code output) is implementable
4. Can swap LLM providers with config change
5. Sub-second latency for code execution (excluding actual runtime)

---

## Future Considerations

- Interactive sandbox environments (terminal sessions)
- Vision/multimodal support
- MCP (Model Context Protocol) integration
- Cost tracking and optimization
- GPU passthrough for ML workloads

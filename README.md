# CodeSync

CodeSync is a real-time technical interview platform built on the MERN stack. It lets interviewers set up a coding environment, generate test cases without writing any code, and watch the candidate work live. Both parties share the same editor state over WebSockets.

---

## How It Works

The platform has two roles: **Interviewer** and **Candidate**. When a room is created, two separate access URLs are generated — one for each role. The interviewer gets full control over the problem setup, test generation, and execution. The candidate only sees the editor and their results.

### Room and Test Case Setup

The interviewer builds a problem using a visual input block editor. Each block represents a part of the input (an integer, an array, a string, etc.). When the interviewer submits the configuration, the frontend serializes these blocks into a structured JSON schema and sends it to the server.

The server takes that schema and constructs a valid C++ source file using `testlib.h`, a standard competitive programming library for writing randomized input generators. The file is compiled using `g++` on the host machine and executed multiple times with different seeds to produce randomized test case inputs. A second C++ program (the validator) runs each input and produces the expected output. Both inputs and expected outputs are saved to the room document in MongoDB.

### Live Editor Sync

Both users connect to the same Socket.IO room. The Monaco editor (same editor used in VS Code) emits change events on every keystroke. These are broadcast to all participants in the room, keeping both screens in sync at all times. The collaborative editing layer is backed by Yjs, a CRDT library, with state synced over a separate WebSocket connection.

### Code Execution

When the candidate clicks Run, the client sends a POST request to the server with the current code, language, and problem ID. The server fetches the room's test cases from MongoDB, then sends the candidate's code to the Piston API once per test case — all concurrently. Piston runs the code in an isolated Docker container. The server normalizes line endings in both the actual and expected output before comparing them. Results are emitted back over Socket.IO so both the interviewer and candidate see them simultaneously.

Test cases beyond the first three are hidden from the candidate to prevent hardcoding, similar to how platforms like HackerRank handle it.

### Participant Tracking and Rate Limiting

Participant presence (who is in the room, their role, their socket ID) is stored in Redis with a 24-hour TTL. Chat history is also persisted in Redis. Rate limiting on the execute endpoint uses a Redis key with a 1-second expiry to prevent rapid repeated execution requests.

---

## Architecture

```
client/           React + Vite frontend
  src/
    pages/        Room, Dashboard, Login, Signup, etc.
    hooks/        useRoomSocket, useWebRTC
    utils/        generatorBuilder.ts (JSON schema -> C++ source)
    components/   TestGeneratorModal, VideoPanel, etc.

server/           Node.js + Express backend
  src/
    config/       MongoDB and Redis connections
    models/       Room, User, Session, ReplayEvent
    routes/       auth, rooms, sessions
    socket/       roomHandler (Socket.IO events)
    utils/        testlib.h

shared/           TypeScript types shared between client and server
```

---

## Tech Stack

**Frontend**
- React 18, Vite, TypeScript
- Tailwind CSS
- Monaco Editor (`@monaco-editor/react`)
- Socket.IO client
- Yjs + y-websocket (CRDT collaborative editing)

**Backend**
- Node.js, Express, TypeScript
- MongoDB + Mongoose
- Socket.IO
- Redis (Upstash or local) via ioredis
- Piston API (code execution sandbox)
- `child_process` with `g++` (test case compilation)

---

## Local Setup

**Prerequisites**
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Piston API (local via Docker or remote)
- `g++` in system PATH (required for test case generation only)

**Install**

```bash
# From the project root (npm workspaces)
npm install
```

**Environment**

`server/.env`:
```
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/codesync
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret
PISTON_API_URL=http://localhost:2000/api/v2/execute
```

`client/.env`:
```
VITE_API_URL=http://localhost:3001
```

**Run**

```bash
npm run dev
```

This builds the shared package and starts both the server (port 3001) and the client (port 5173) concurrently.

For Piston locally:
```bash
docker run -d --privileged -p 2000:2000 ghcr.io/engineer-man/piston
```

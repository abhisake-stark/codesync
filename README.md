# CodeSync - Collaborative Interview Platform

CodeSync is a real-time collaborative competitive programming and technical interview platform. It empowers interviewers to create dynamic coding environments, generate complex test cases on the fly without writing generator code, and observe candidates as they solve problems in real-time.

---

## 🚀 Features at a Glance

- **Role-Based Access**: Generates distinct `Interviewer` and `Candidate` URLs. Interviewers have elevated privileges.
- **Collaborative Editor**: Real-time code synchronization using Monaco Editor (the editor powering VS Code) and WebSockets.
- **Dynamic Test Case Generator (No-Code)**: Interviewers can define input structures (Variables, Arrays, Strings, Matrices, Trees, Graphs) using a React visual builder. The backend automatically translates this schema into C++ code utilizing `testlib.h` and natively compiles it to generate robust randomized test cases.
- **Isolated Code Execution**: Executes candidate code against the generated test cases using the **Piston API** (a high-performance code execution engine).
- **HackerRank-Style Evaluation**: Evaluates outputs against expected outputs, normalizes line endings automatically, and hides large test cases after the first three to prevent candidates from hardcoding solutions.

---

## 🏗️ Architecture & Flow

The system is broken down into two main parts: a React/Vite Frontend and a Node.js/Express Backend. 

### 1. Room Creation Flow
When an interviewer creates a room, they configure the environment (language, problems). 
For the **Test Case Generation**:
1. The frontend parses the visual input blocks (e.g., "Add Integer N", "Add Array A of size N") into a structured JSON schema.
2. `generatorBuilder.ts` on the frontend transforms this schema into a raw C++ file string utilizing the industry-standard competitive programming library `testlib.h`.
3. The string is sent to the backend endpoint (`POST /rooms/:code/generate-testcases`).
4. The backend writes this code to a temporary `generator.cpp` file, compiles it natively using the host's GCC (`g++` via MSYS2 on Windows), and executes it `X` times to generate randomized inputs and expected outputs.
5. The generated test cases are saved to MongoDB as part of the Room document.

### 2. Interview & Execution Flow
1. Both users connect to the Room URL. The backend uses the UUID in the URL to determine if the user is an Interviewer or a Candidate.
2. They are placed in a Socket.IO room. Code changes in the Monaco editor emit `code-change` events, which are broadcasted to keep both screens in sync.
3. When the candidate hits "Run Code", a request is sent to `POST /rooms/:code/execute`.
4. The backend pulls the candidate's code and fires it off to the **Piston API** (local or remote) alongside the standard input (stdin) for each generated test case concurrently.
5. Outputs are retrieved, line endings are normalized (`\r\n` to `\n`), and the candidate's output is compared strictly against the generator's expected output. Results are synced back via WebSockets.

---

## 💻 Tech Stack

### Frontend (Client)
- **Framework**: React 18 with Vite for blazing-fast HMR and building.
- **Styling**: Tailwind CSS for utility-first, highly responsive, and modern UI components.
- **Icons**: `lucide-react` for beautiful, consistent SVG icons.
- **Editor**: `@monaco-editor/react` for the powerful, syntax-highlighted code editing experience.
- **Routing**: `react-router-dom` for client-side routing.
- **State/Sockets**: Standard React Hooks paired with `socket.io-client` for real-time duplex communication.

### Backend (Server)
- **Runtime**: Node.js with TypeScript.
- **API**: Express.js for REST endpoints (Auth, Room data, Execution proxy).
- **Database**: MongoDB with Mongoose ORM for storing user accounts, room sessions, and problem data.
- **Real-Time Engine**: Socket.IO for handling WebSockets.
- **Compilation**: Node's `child_process` (`execSync`, `spawn`) for compiling and running C++ test case generators directly on the host machine.
- **Execution Sandbox**: Piston API for running untrusted user code in isolated environments.

---

## 🧩 Key Code Snippets

### 1. Dynamic C++ Generator Builder (Frontend)
Instead of forcing interviewers to write `testlib.h` code, the frontend translates UI blocks into C++.

```typescript
// client/src/utils/generatorBuilder.ts
export const generateDynamicCpp = (blocks: InputBlock[], hasMultipleTestCases: boolean, tMin: number, tMax: number): string => {
  let cppCode = `#include "testlib.h"
#include <iostream>
#include <vector>
#include <string>

using namespace std;

void generateTestCase() {
`;

  blocks.forEach(block => {
    if (block.type === 'variable') {
      cppCode += `  int ${block.name} = rnd.next(${block.min}, ${block.max});\n`;
      cppCode += `  cout << ${block.name} << " ";\n`;
    } else if (block.type === 'array') {
      cppCode += `  int ${block.sizeVar} = rnd.next(${block.minSize}, ${block.maxSize});\n`;
      cppCode += `  cout << ${block.sizeVar} << "\n";\n`;
      cppCode += `  for(int i=0; i<${block.sizeVar}; i++) { cout << rnd.next(${block.minVal}, ${block.maxVal}) << " "; }\n`;
      cppCode += `  cout << "\n";\n`;
    }
    // ... handles strings, matrices, trees, etc.
  });

  cppCode += `  cout << "\n";\n}\n\n`;
  // ... wraps in main() with rnd.setSeed(argc, argv)
  return cppCode;
};
```

### 2. Native Compilation & Execution (Backend)
The backend securely compiles the generated C++ code, links it against `testlib.h`, and executes it.

```typescript
// server/src/routes/rooms.ts (Snippet)
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

router.post('/:code/generate-testcases', async (req, res) => {
  const { generatorCode, numCases } = req.body;
  const tempDir = path.join(__dirname, '../temp');
  const cppFile = path.join(tempDir, 'generator.cpp');
  const exeFile = path.join(tempDir, 'generator.exe');

  // Write the frontend-generated code to a file
  fs.writeFileSync(cppFile, generatorCode);

  try {
    // Compile using GCC (MSYS2 on Windows)
    execSync(`g++ -O2 -std=c++17 ${cppFile} -o ${exeFile} -I${path.join(__dirname, '../utils')}`);
    
    const testCases = [];
    for (let i = 0; i < numCases; i++) {
      // Execute the binary to get random input
      const input = execSync(`${exeFile} ${Math.random() * 10000}`).toString().trim();
      testCases.push({ input, expectedOutput: '' });
    }
    
    // ... save to MongoDB
    res.json({ testCases });
  } catch (error) {
    res.status(500).json({ error: 'Compilation failed', details: error.message });
  }
});
```

### 3. Piston API Execution Proxy
Candidate code is sent to the Piston execution engine.

```typescript
// server/src/routes/rooms.ts (Snippet)
const testPromises = testCases.map(async (tc: any) => {
  // Send code and test case input to Piston
  const tcRes = await axios.post('http://localhost:2000/api/v2/execute', {
    language: 'cpp',
    version: '*',
    files: [{ name: 'main.cpp', content: candidateCode }],
    stdin: tc.input
  }, { timeout: 10000 });

  const runOutput = tcRes.data.run.stdout || tcRes.data.run.stderr;
  
  // Normalize Windows \r\n to Linux \n for strict equality comparison
  const normalizedActual = runOutput.replace(/\r\n/g, '\n').trim();
  const normalizedExpected = tc.expectedOutput.replace(/\r\n/g, '\n').trim();

  return {
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    actualOutput: runOutput,
    passed: normalizedActual === normalizedExpected,
    hidden: false // Logic applied later to hide test cases > 3
  };
});
```

---

## 🛠️ Local Development Setup

1. **Clone & Install Dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=3001
   MONGO_URI=mongodb://127.0.0.1:27017/codesync
   JWT_SECRET=your_super_secret_key
   PISTON_API_URL=http://localhost:2000/api/v2/execute
   ```

3. **Prerequisites**
   - **MongoDB**: Must be running locally on port 27017 (or update `MONGO_URI`).
   - **Piston API**: Needs to be hosted locally or remotely. If local, run via Docker.
   - **C++ Compiler**: A valid `g++` installation (like MSYS2 on Windows) must be in your system's `PATH` for the native test case generator to compile.

4. **Run the Application**
   Open two terminals:
   ```bash
   # Terminal 1: Start Backend (Runs on Port 3001)
   cd server
   npm run dev

   # Terminal 2: Start Frontend (Runs on Port 5173)
   cd client
   npm run dev
   ```

Navigate to `http://localhost:5173` to start syncing!

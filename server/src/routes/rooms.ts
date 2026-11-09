import express, { Request, Response } from 'express';
import { Room } from '../models/Room';
import { Session } from '../models/Session';
import { protect } from '../middleware/auth';
import { getParticipantRoleFromRedis, checkRateLimit } from '../config/redis';
import { Server } from 'socket.io';
import { docs } from 'y-websocket/bin/utils';
import * as Y from 'yjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const createRoomsRouter = (io: Server) => {
  const router = express.Router();

  router.post('/', protect, async (req: Request, res: Response) => {
    try {
      const { language = 'javascript', problems = [{ title: 'Untitled Problem', statement: '' }] } = req.body;
      const interviewerCode = uuidv4();
      const candidateCode = uuidv4();

      const room = await Room.create({
        interviewerCode,
        candidateCode,
        language,
        problems,
        hostId: req.user!._id
      });

      res.status(201).json(room.toJSON());
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create room', details: error.message });
    }
  });

  router.get('/:code', protect, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const room = await Room.findOne({
        $or: [{ interviewerCode: code }, { candidateCode: code }]
      });

      if (!room) return res.status(404).json({ error: 'Room not found' });

      const myRole = code === room.interviewerCode ? 'interviewer' : 'candidate';
      
      const roomData = room.toJSON();
      (roomData as any).myRole = myRole;
      
      if (myRole === 'candidate') {
        (roomData as any).interviewerCode = undefined;
      }

      res.json(roomData);
    } catch (error: any) {
        console.error(error);
        if (error.response?.data?.message) return res.status(500).json({ error: 'Piston Error: ' + error.response.data.message });
        res.status(500).json({ error: 'Failed to generate tests', details: error.message });
      }
  });

  router.post('/:id/visibility', protect, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isHidden } = req.body;
      const userId = req.user!._id.toString();
      io.to(id).emit('candidate-visibility-alert', { userId, isHidden });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:code/generate-tests', protect, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const { problemId, generatorCode, validatorCode, numTests = 5 } = req.body;

      const room = await Room.findOne({ interviewerCode: code });
      if (!room) return res.status(403).json({ error: 'Only interviewers can generate tests' });

      const problem = room.problems.id(problemId);
      if (!problem) return res.status(404).json({ error: 'Problem not found' });

      problem.generatorCode = generatorCode;
      problem.validatorCode = validatorCode;
      
      const testlibPath = path.join(__dirname, '..', 'utils', 'testlib.h');
      const testlibContent = fs.readFileSync(testlibPath, 'utf-8');

      const { execSync } = require('child_process');
      const os = require('os');
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesync-'));
      const genPath = path.join(tempDir, 'gen.cpp');
      const valPath = path.join(tempDir, 'val.cpp');
      const tlPath = path.join(tempDir, 'testlib.h');
      const genExe = path.join(tempDir, 'gen.exe');
      const valExe = path.join(tempDir, 'val.exe');
      
      fs.writeFileSync(genPath, generatorCode);
      fs.writeFileSync(valPath, validatorCode);
      fs.writeFileSync(tlPath, testlibContent);

      const env = { ...process.env, PATH: 'C:\\msys64\\ucrt64\\bin;' + process.env.PATH };

      try {
        execSync(`g++ -O2 "${genPath}" -o "${genExe}"`, { stdio: 'pipe', env });
      } catch(err: any) {
        return res.status(400).json({ error: 'Generator compilation failed', details: err.stderr ? err.stderr.toString() : err.message });
      }

      try {
        execSync(`g++ -O2 "${valPath}" -o "${valExe}"`, { stdio: 'pipe', env });
      } catch(err: any) { console.error('Validator compilation failed:', err.stderr ? err.stderr.toString() : err.message); console.error('Code was:', validatorCode); return res.status(400).json({ error: 'Validator compilation failed', details: err.stderr ? err.stderr.toString() : err.message });
      }

      let generatedInputs: string[] = [];
      for(let i=0; i < numTests; i++) {
          const seed = Math.floor(Math.random() * 1000000).toString();
          try {
            const out = execSync(`"${genExe}" ${seed}`, { stdio: 'pipe', env });
            generatedInputs.push(out.toString().trim());
          } catch(err: any) {
            return res.status(400).json({ error: 'Generator failed to run', details: err.stderr ? err.stderr.toString() : err.message });
          }
      }

      let finalTestCases: any[] = [];
      for(let input of generatedInputs) {
          try {
            const out = execSync(`"${valExe}"`, { input: input, stdio: 'pipe', env });
            finalTestCases.push({ input, expectedOutput: out.toString().trim() });
          } catch (err: any) {
            return res.status(400).json({ error: 'Validator failed to run', details: err.stderr ? err.stderr.toString() : err.message });
          }
      }
      
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}

      problem.testCases = finalTestCases as any;
      await room.save();

      io.to(room._id.toString()).emit('problem-updated', room.problems);
      res.json(room.toJSON());
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate tests', details: error.message });
    }
  });


  router.post('/:code/execute', protect, async (req: Request, res: Response) => {
    try {
      const { code: roomCodeParam } = req.params;
      const { code, language, problemId } = req.body;
      
      const room = await Room.findOne({
        $or: [{ interviewerCode: roomCodeParam }, { candidateCode: roomCodeParam }]
      });
      if (!room) return res.status(404).json({ error: 'Room not found' });
      
      const socketRoomId = room._id.toString();

      const allowed = await checkRateLimit(socketRoomId);
      if (!allowed) return res.status(429).json({ error: 'Too many execution requests.' });

      io.to(socketRoomId).emit('execution-started');

      let pistonLanguage = language;
      if (language === 'cpp') pistonLanguage = 'cpp';

      const fileExtensions: Record<string, string> = {
        javascript: 'js', typescript: 'ts', python: 'py', python3: 'py', cpp: 'cpp', c: 'c', java: 'java'
      };
      const ext = fileExtensions[pistonLanguage] || 'txt';

      const problem = room.problems.id(problemId);
      const testCases = problem?.testCases || [];

      if (testCases.length > 0) {
        const testPromises = testCases.map(async (tc: any, index: number) => {
          let testCaseHarness = '';
          const injectedCode = testCaseHarness + code;

          const tcRes = await axios.post(process.env.PISTON_API_URL || 'http://localhost:2000/api/v2/execute', {
            language: pistonLanguage,
            version: '*',
            files: [{ name: `main.${ext}`, content: injectedCode }],
            stdin: tc.input
          }, { timeout: 10000 });
          
          const stdout = tcRes.data.run.stdout || '';
          const stderr = tcRes.data.run.stderr || '';
          const passed = stdout.replace(/\r\n/g, '\n').trim() === tc.expectedOutput.replace(/\r\n/g, '\n').trim();
          
          return {
            testCaseIndex: index + 1, passed, actualOutput: (stdout.trim() || stderr.trim()), expectedOutput: tc.expectedOutput.trim(), input: tc.input
          };
        });
        
        const testResults = await Promise.all(testPromises);
        const allPassed = testResults.every(tr => tr.passed);
        const result = { stdout: allPassed ? 'All test cases passed!' : 'Some test cases failed.', stderr: '', code: allPassed ? 0 : 1, testResults };
        
        io.to(socketRoomId).emit('execution-result', result);
        return res.json(result);
      }

      const pistonResponse = await axios.post(process.env.PISTON_API_URL || 'http://localhost:2000/api/v2/execute', {
        language: pistonLanguage, version: '*', files: [{ name: `main.${ext}`, content: code }]
      });

      const result = { stdout: pistonResponse.data.run.stdout, stderr: pistonResponse.data.run.stderr, code: pistonResponse.data.run.code };
      io.to(socketRoomId).emit('execution-result', result);
      res.json(result);
    } catch (error: any) {
      console.error('Piston execution error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Execution failed' });
    }
  });

  router.post('/:code/end', protect, async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const room = await Room.findOne({ interviewerCode: code });
      
      if (!room) return res.status(403).json({ error: 'Only interviewers can end room' });

      const socketRoomId = room._id.toString();
      const doc = docs.get(socketRoomId);
      if (doc) {
        room.ydocState = Buffer.from(Y.encodeStateAsUpdate(doc));
        doc.destroy();
        docs.delete(socketRoomId);
      }

      room.status = 'ended';
      room.endedAt = new Date();
      await room.save();

      io.to(socketRoomId).emit('room-ended');
      io.in(socketRoomId).disconnectSockets();
      res.json({ success: true, room: room.toJSON() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to end room' });
    }
  });

  return router;
};

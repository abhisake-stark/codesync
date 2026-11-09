import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Loader2, Plus, Trash2, Code2, LayoutDashboard } from 'lucide-react';
import { generateDynamicCpp, GeneratorSchema, Block } from '../utils/generatorBuilder';

export const TestGeneratorModal = ({ isOpen, onClose, roomCode, problemId, initialGenerator, initialValidator, onGenerated }: any) => {
  const [mode, setMode] = useState<'builder' | 'editor'>('builder');
  
  const [generatorCode, setGeneratorCode] = useState(initialGenerator || '');
  const [validatorCode, setValidatorCode] = useState(initialValidator || '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n; cin >> n;\n  cout << n * 2 << endl;\n  return 0;\n}');
  const [numTests, setNumTests] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const [schema, setSchema] = useState<GeneratorSchema>({
    multipleTestCases: false,
    tMin: '1',
    tMax: '10',
    blocks: []
  });

  useEffect(() => {
    if (mode === 'builder') {
      setGeneratorCode(generateDynamicCpp(schema));
    }
  }, [schema, mode]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/rooms/${roomCode}/generate-tests`, {
        problemId,
        generatorCode,
        validatorCode,
        numTests
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      onGenerated(res.data.problems.find((p:any) => p._id === problemId));
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate tests');
      if (err.response?.data?.details) console.error(err.response.data.details);
    } finally {
      setIsGenerating(false);
    }
  };

  const addBlock = (type: Block['type']) => {
    const newBlock: any = { id: Math.random().toString(36).substr(2, 9), type };
    if (type === 'variables') { newBlock.names = 'N'; newBlock.min = '1'; newBlock.max = '100'; }
    if (type === 'array') { newBlock.name = 'A'; newBlock.size = 'N'; newBlock.min = '1'; newBlock.max = '1000'; }
    if (type === 'string') { newBlock.name = 'S'; newBlock.length = 'N'; newBlock.charset = 'a-z'; }
    if (type === 'matrix') { newBlock.name = 'grid'; newBlock.rows = 'N'; newBlock.cols = 'M'; newBlock.min = '1'; newBlock.max = '100'; }
    setSchema(s => ({ ...s, blocks: [...s.blocks, newBlock] }));
  };

  const updateBlock = (id: string, updates: any) => {
    setSchema(s => ({
      ...s,
      blocks: s.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeBlock = (id: string) => {
    setSchema(s => ({
      ...s,
      blocks: s.blocks.filter(b => b.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl flex flex-col h-[90vh]">
        
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">Generate Test Cases</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setMode('builder')} 
                className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-2 ${mode === 'builder' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Visual Builder
              </button>
              <button 
                onClick={() => setMode('editor')} 
                className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-2 ${mode === 'editor' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Code2 className="w-4 h-4" /> C++ Editor
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex gap-6 bg-slate-50">
          {mode === 'builder' && (
            <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                  Global Settings
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="multiTest" checked={schema.multipleTestCases} onChange={e => setSchema(s => ({ ...s, multipleTestCases: e.target.checked }))} />
                  <label htmlFor="multiTest" className="text-sm font-semibold text-slate-700">Multiple Test Cases (T)</label>
                </div>
                {schema.multipleTestCases && (
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 font-bold">Min T:</label>
                      <input type="text" value={schema.tMin} onChange={e => setSchema(s => ({ ...s, tMin: e.target.value }))} className="w-16 px-2 py-1 text-sm border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 font-bold">Max T:</label>
                      <input type="text" value={schema.tMax} onChange={e => setSchema(s => ({ ...s, tMax: e.target.value }))} className="w-16 px-2 py-1 text-sm border rounded" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {schema.blocks.map((block, i) => (
                  <div key={block.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative group">
                    <button onClick={() => removeBlock(block.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                      Block {i + 1}: {block.type}
                    </div>
                    
                    {block.type === 'variables' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Names (space sep)</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.names} onChange={e => updateBlock(block.id, { names: e.target.value })} placeholder="N K" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Mins (space sep)</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.min} onChange={e => updateBlock(block.id, { min: e.target.value })} placeholder="1 1" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Maxs (space sep)</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.max} onChange={e => updateBlock(block.id, { max: e.target.value })} placeholder="100 100" /></div>
                      </div>
                    )}

                    {block.type === 'array' && (
                      <div className="grid grid-cols-4 gap-3">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Var Name</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.name} onChange={e => updateBlock(block.id, { name: e.target.value })} placeholder="A" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Size</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.size} onChange={e => updateBlock(block.id, { size: e.target.value })} placeholder="N" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Elem Min</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.min} onChange={e => updateBlock(block.id, { min: e.target.value })} placeholder="1" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Elem Max</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.max} onChange={e => updateBlock(block.id, { max: e.target.value })} placeholder="1000" /></div>
                      </div>
                    )}

                    {block.type === 'string' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Var Name</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.name} onChange={e => updateBlock(block.id, { name: e.target.value })} placeholder="S" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Length</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.length} onChange={e => updateBlock(block.id, { length: e.target.value })} placeholder="N" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Charset (Regex)</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.charset} onChange={e => updateBlock(block.id, { charset: e.target.value })} placeholder="a-z" /></div>
                      </div>
                    )}

                    {block.type === 'matrix' && (
                      <div className="grid grid-cols-5 gap-3">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Var Name</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.name} onChange={e => updateBlock(block.id, { name: e.target.value })} placeholder="grid" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Rows</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.rows} onChange={e => updateBlock(block.id, { rows: e.target.value })} placeholder="N" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Cols</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.cols} onChange={e => updateBlock(block.id, { cols: e.target.value })} placeholder="M" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Elem Min</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.min} onChange={e => updateBlock(block.id, { min: e.target.value })} placeholder="1" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Elem Max</label><input type="text" className="w-full border rounded px-2 py-1 text-sm" value={block.max} onChange={e => updateBlock(block.id, { max: e.target.value })} placeholder="1000" /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => addBlock('variables')} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Variables</button>
                <button onClick={() => addBlock('array')} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Array</button>
                <button onClick={() => addBlock('string')} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> String</button>
                <button onClick={() => addBlock('matrix')} className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Matrix</button>
              </div>
            </div>
          )}

          <div className={`${mode === 'builder' ? 'w-1/2' : 'w-full'} flex flex-col gap-4`}>
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                <label className="font-bold text-sm text-slate-200">generator.cpp</label>
                {mode === 'builder' && <span className="text-xs text-slate-400">Auto-generated</span>}
              </div>
              <textarea 
                value={generatorCode} 
                onChange={e => {
                  setGeneratorCode(e.target.value);
                  if (mode === 'builder') setMode('editor');
                }}
                className="flex-1 bg-slate-900 text-slate-100 font-mono text-sm p-4 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>

            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2">
                <label className="font-bold text-sm text-slate-200">validator.cpp</label>
              </div>
              <textarea 
                value={validatorCode} 
                onChange={e => setValidatorCode(e.target.value)}
                className="flex-1 bg-slate-900 text-slate-100 font-mono text-sm p-4 focus:outline-none resize-none"
                spellCheck={false}
                placeholder={`#include <iostream>\nusing namespace std;\n\nint main() {\n  int n; cin >> n;\n  cout << n * 2 << endl;\n  return 0;\n}`}
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-xl">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Number of tests:</label>
            <input type="number" min="1" max="20" value={numTests} onChange={e => setNumTests(parseInt(e.target.value))} className="w-20 px-2 py-1 border rounded" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">Cancel</button>
            <button onClick={handleGenerate} disabled={isGenerating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-bold flex items-center gap-2 shadow-md">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isGenerating ? 'Generating Tests...' : 'Generate Tests'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

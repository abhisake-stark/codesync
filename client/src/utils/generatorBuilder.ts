export type BlockType = 'variables' | 'array' | 'string' | 'matrix';

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface VariablesBlock extends BlockBase {
  type: 'variables';
  names: string; // e.g. "N K"
  min: string; // e.g. "1 1"
  max: string; // e.g. "100 100"
}

export interface ArrayBlock extends BlockBase {
  type: 'array';
  name: string;
  size: string; // e.g. "N"
  min: string;
  max: string;
}

export interface StringBlock extends BlockBase {
  type: 'string';
  name: string;
  length: string; // e.g. "N"
  charset: string; // e.g. "a-z"
}

export interface MatrixBlock extends BlockBase {
  type: 'matrix';
  name: string;
  rows: string; // e.g. "N"
  cols: string; // e.g. "K"
  min: string;
  max: string;
}

export type Block = VariablesBlock | ArrayBlock | StringBlock | MatrixBlock;

export interface GeneratorSchema {
  multipleTestCases: boolean;
  tMin: string;
  tMax: string;
  blocks: Block[];
}

export function generateDynamicCpp(schema: GeneratorSchema): string {
  let cpp = `#include "testlib.h"\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n`;

  // Helper function to generate a block
  const generateBlock = (block: Block, indent: string) => {
    let code = '';
    if (block.type === 'variables') {
      const names = block.names.split(' ').filter(n => n.trim() !== '');
      const mins = block.min.split(' ').filter(n => n.trim() !== '');
      const maxs = block.max.split(' ').filter(n => n.trim() !== '');
      
      names.forEach((name, i) => {
        const minVal = mins[i] || '1';
        const maxVal = maxs[i] || '100';
        code += `${indent}long long ${name} = rnd.next(${minVal}LL, ${maxVal}LL);\n`;
      });
      if (names.length > 0) {
        code += `${indent}println(${names.join(', ')});\n`;
      }
    } 
    else if (block.type === 'array') {
      const size = block.size || '10';
      const minVal = block.min || '1';
      const maxVal = block.max || '100';
      code += `${indent}vector<long long> ${block.name}(${size});\n`;
      code += `${indent}for(int i=0; i<${size}; i++) {\n`;
      code += `${indent}  ${block.name}[i] = rnd.next(${minVal}LL, ${maxVal}LL);\n`;
      code += `${indent}}\n`;
      code += `${indent}println(${block.name});\n`;
    }
    else if (block.type === 'string') {
      const length = block.length || '10';
      const charset = block.charset || 'a-z';
      code += `${indent}string ${block.name} = rnd.next("[${charset}]{%d}", (int)${length});\n`;
      code += `${indent}println(${block.name});\n`;
    }
    else if (block.type === 'matrix') {
      const rows = block.rows || '10';
      const cols = block.cols || '10';
      const minVal = block.min || '1';
      const maxVal = block.max || '100';
      code += `${indent}for(int i=0; i<${rows}; i++) {\n`;
      code += `${indent}  vector<long long> row(${cols});\n`;
      code += `${indent}  for(int j=0; j<${cols}; j++) {\n`;
      code += `${indent}    row[j] = rnd.next(${minVal}LL, ${maxVal}LL);\n`;
      code += `${indent}  }\n`;
      code += `${indent}  println(row);\n`;
      code += `${indent}}\n`;
    }
    return code;
  };

  cpp += `void generate_test() {\n`;
  schema.blocks.forEach(block => {
    cpp += generateBlock(block, '  ');
  });
  cpp += `}\n\n`;

  cpp += `int main(int argc, char* argv[]) {\n`;
  cpp += `  registerGen(argc, argv, 1);\n`;

  if (schema.multipleTestCases) {
    const tMin = schema.tMin || '1';
    const tMax = schema.tMax || '10';
    cpp += `  long long T = rnd.next(${tMin}LL, ${tMax}LL);\n`;
    cpp += `  println(T);\n`;
    cpp += `  while (T--) {\n`;
    cpp += `    generate_test();\n`;
    cpp += `  }\n`;
  } else {
    cpp += `  generate_test();\n`;
  }

  cpp += `  return 0;\n`;
  cpp += `}\n`;

  return cpp;
}

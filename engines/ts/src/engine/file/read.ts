import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AnzaError } from '../../errors/index.js';

export async function text(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err: any) {
    // Name the file only, never the full path.
    throw AnzaError.notFound(`Failed to read template ${path.basename(filePath)}: ${err?.code ?? 'error'}`);
  }
}

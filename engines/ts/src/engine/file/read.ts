import * as fs from 'node:fs/promises';
import { AnzaError } from '../../errors/index.js';

export async function text(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err: any) {
    throw AnzaError.notFound(`Failed to read template at ${filePath}: ${err.message}`);
  }
}

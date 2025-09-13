
import { resolve } from 'path';
import * as fs from 'fs';

export function readConfig(path: string): any {
  return JSON.parse(fs.readFileSync(resolve(path), 'utf8'));
}

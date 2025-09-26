import * as fs from "fs";
import { Helper } from "../utils/helper";

export function processFile(filePath: string): string {
	return fs.readFileSync(filePath, "utf-8");
}

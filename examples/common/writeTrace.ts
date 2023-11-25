import * as fs from 'fs';

/**
 * Write the JSON string to the file
 * @param jsonString
 */
export function writeTrace(jsonString: string) {
  const filePath = process?.argv?.[1]?.replace('.ts', '.json');
  fs.writeFile(filePath, jsonString, 'utf-8', (err) => {
    if (err) {
      console.error('Error writing JSON to file:', err);
    } else {
      console.log(`JSON data written to ${filePath}`);
    }
  });
}

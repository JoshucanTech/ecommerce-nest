import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export class DebugLogger {
  private readonly logger: Logger;
  
  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, data?: any) {
    const callerInfo = this.getCallerInfo();
    const logMessage = `[${callerInfo.file}:${callerInfo.line}] ${message}`;
    
    this.logger.log(logMessage);
    
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  error(message: string, error?: any, data?: any) {
    const callerInfo = this.getCallerInfo();
    const logMessage = `[${callerInfo.file}:${callerInfo.line}] ${message}`;
    
    this.logger.error(logMessage, error?.stack);
    
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
    
    if (error) {
      console.log('Error details:', error);
    }
  }

  warn(message: string, data?: any) {
    const callerInfo = this.getCallerInfo();
    const logMessage = `[${callerInfo.file}:${callerInfo.line}] ${message}`;
    
    this.logger.warn(logMessage);
    
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  debug(message: string, data?: any) {
    const callerInfo = this.getCallerInfo();
    const logMessage = `[${callerInfo.file}:${callerInfo.line}] ${message}`;
    
    this.logger.debug(logMessage);
    
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  private getCallerInfo(): { file: string; line: number; function: string } {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    
    try {
      Error.prepareStackTrace = (_, stack) => stack;
      const err = new Error();
      const stack = err.stack as any as NodeJS.CallSite[];
      
      Error.prepareStackTrace = originalPrepareStackTrace;
      
      // Find the first stack frame outside of this file and logger-related files
      const callerFrame = stack.find(
        frame => 
          frame.getFileName() && 
          !frame.getFileName().includes('debug-logger') &&
          !frame.getFileName().includes('node_modules') &&
          frame.getFileName().includes('src')
      ) || stack[2];
      
      if (callerFrame) {
        const fileName = path.basename(callerFrame.getFileName() || 'unknown');
        const line = callerFrame.getLineNumber() || 0;
        const functionName = callerFrame.getFunctionName() || 'anonymous';
        
        return {
          file: fileName,
          line: line,
          function: functionName,
        };
      }
    } catch (e) {
      // Restore original prepareStackTrace in case of error
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
    
    return {
      file: 'unknown',
      line: 0,
      function: 'unknown',
    };
  }

  getCodeSnippet(filePath: string, lineNumber: number, contextLines = 2): string {
    try {
      if (!fs.existsSync(filePath)) {
        return `File not found: ${filePath}`;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      const startLine = Math.max(0, lineNumber - contextLines - 1);
      const endLine = Math.min(lines.length, lineNumber + contextLines);
      
      const snippet = lines.slice(startLine, endLine)
        .map((line, index) => {
          const currentLine = startLine + index + 1;
          const isTargetLine = currentLine === lineNumber;
          const linePrefix = isTargetLine ? '> ' : '  ';
          return `${linePrefix}${currentLine}: ${line}`;
        })
        .join('\n');
      
      return snippet;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  }
}
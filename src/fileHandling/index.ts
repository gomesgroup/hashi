import fileRoutes from './routes/fileRoutes';
import * as fileManagerService from './services/fileManagerService';
import config from './config';
import { handleFileUploadErrors, singleFileUpload, multiFileUpload } from './middlewares/fileUploadMiddleware';
import * as fileController from './controllers/fileController';
import { FileFormat, formatToMimeType, extensionToFormat } from './types';

/**
 * Initialize file handling system
 */
export const initialize = async (): Promise<void> => {
  await fileManagerService.initialize();
};

export {
  // Routes
  fileRoutes,
  
  // Services
  fileManagerService,
  
  // Config
  config,
  
  // Middlewares
  handleFileUploadErrors,
  singleFileUpload,
  multiFileUpload,
  
  // Controllers
  fileController,
  
  // Types
  FileFormat,
  formatToMimeType,
  extensionToFormat
};
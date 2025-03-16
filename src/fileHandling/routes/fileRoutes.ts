import { Router } from 'express';
import * as fileController from '../controllers/fileController';
import { singleFileUpload, multiFileUpload, handleFileUploadErrors } from '../middlewares/fileUploadMiddleware';

const router = Router();

/**
 * @route   POST /api/files/upload
 * @desc    Upload a molecular structure file
 * @access  Public
 */
router.post('/upload', singleFileUpload, handleFileUploadErrors, fileController.uploadFile);

/**
 * @route   POST /api/files/upload/multiple
 * @desc    Upload multiple molecular structure files
 * @access  Public
 */
router.post('/upload/multiple', multiFileUpload, handleFileUploadErrors, fileController.uploadMultipleFiles);

/**
 * @route   GET /api/files/:id
 * @desc    Download a file
 * @access  Public
 */
router.get('/:id', fileController.downloadFile);

/**
 * @route   POST /api/files/:id/convert
 * @desc    Convert file to another format
 * @access  Public
 */
router.post('/:id/convert', fileController.convertFile);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a file
 * @access  Public
 */
router.delete('/:id', fileController.deleteFile);

/**
 * @route   GET /api/files/formats
 * @desc    Get supported file formats
 * @access  Public
 */
router.get('/formats/supported', fileController.getSupportedFormats);

/**
 * @route   GET /api/files/session/:sessionId
 * @desc    Get files by session ID
 * @access  Public
 */
router.get('/session/:sessionId', fileController.getFilesBySession);

/**
 * @route   GET /api/files/:id/metadata
 * @desc    Get file metadata
 * @access  Public
 */
router.get('/:id/metadata', fileController.getFileMetadata);

export default router;
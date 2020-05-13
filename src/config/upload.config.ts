import path from 'path';
import multer from 'multer';

const tmpFolder = path.resolve(__dirname, '..', '..', 'tmp');

export default {
  directory: tmpFolder,
  storage: multer.diskStorage({
    destination: tmpFolder,
    filename: (_, file, callback) => {
      const filename = `${Date.now()}_${file.originalname}`;
      callback(null, filename);
    },
  }),
};

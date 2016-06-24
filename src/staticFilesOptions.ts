import * as path from 'path';

const staticFilesOptions = {
	root: path.join(__dirname, '..', 'public'),
	maxage: (process.env.NODE_ENV === 'production') ? 3600000 : 0
};

export default staticFilesOptions;

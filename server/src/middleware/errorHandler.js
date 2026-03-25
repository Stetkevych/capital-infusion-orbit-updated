const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      details: err.details || err.message
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (err.message === 'Forbidden') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({ message: 'Not found' });
  }

  res.status(err.statusCode || 500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = {
  asyncHandler,
  errorHandler
};

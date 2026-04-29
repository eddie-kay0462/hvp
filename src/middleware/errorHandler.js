export const errorHandler = (err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const msg = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: statusCode,
    msg,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    status: 404,
    msg: `Route ${req.originalUrl} not found`,
    data: null,
  });
};

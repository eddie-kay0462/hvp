export const errorHandler = (err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // 4xx messages are app-controlled and safe to surface (e.g. "Booking not
  // found"). 5xx messages can leak internals (DB/Supabase errors), so return a
  // generic message in production and keep the detail in the server logs above.
  const msg =
    statusCode >= 500 && !isDev
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: statusCode,
    msg,
    data: null,
    ...(isDev && { stack: err.stack }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    status: 404,
    msg: `Route ${req.originalUrl} not found`,
    data: null,
  });
};

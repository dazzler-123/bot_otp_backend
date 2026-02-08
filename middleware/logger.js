// Custom logger middleware for additional logging
const logger = (req, res, next) => {
  const start = Date.now();

  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${new Date().toISOString()}] ${logLevel} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};

module.exports = logger;


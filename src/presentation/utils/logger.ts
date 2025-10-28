import pino from 'pino';

const logger = pino({
  base: {
    service: 'document-management-system',
    version: '1.0.0',
  },
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Add correlation ID support
export const createChildLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

export default logger;
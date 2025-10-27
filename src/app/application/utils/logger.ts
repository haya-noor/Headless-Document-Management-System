import pino from 'pino';


const logger = pino({
transport: {
target: 'pino-pretty',
options: {
colorize: true,
translateTime: 'SYS:standard',
},
},
base: undefined, // remove pid, hostname
});


export default logger;
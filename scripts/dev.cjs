const args=process.argv.slice(2),i=args.indexOf('--port');
if(i>=0) process.env.PORT=args[i+1];
require('../server.js');

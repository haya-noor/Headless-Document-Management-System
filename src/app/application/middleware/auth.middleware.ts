import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';


export const authPlugin = new Elysia()
.use(jwt({
secret: process.env.JWT_SECRET!,
}))
.derive(async ({ jwt, headers, set }) => {
const authHeader = headers['authorization'];
if (!authHeader) {
set.status = 401;
throw new Error('Unauthorized');
}


const token = authHeader.replace('Bearer ', '');
const payload = await jwt.verify(token);


if (!payload) {
set.status = 401;
throw new Error('Invalid token');
}


return {
userContext: {
userId: payload.sub,
workspaceId: payload.workspaceId,
roles: payload.roles,
},
};
});
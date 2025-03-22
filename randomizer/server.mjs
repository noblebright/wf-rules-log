import fastify from "fastify";
import fastifyStatic from "@fastify/static";

import path from "node:path";

const server = fastify();

// first plugin
server.register(fastifyStatic, {
  root: import.meta.dirname,
});

server.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});

export default () => ({
  host: process.env.QUEUE_HOST,
  port: process.env.QUEUE_PORT ? Number(process.env.QUEUE_PORT) : undefined,
});

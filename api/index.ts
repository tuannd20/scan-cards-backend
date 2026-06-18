import { ExpressAdapter } from '@nestjs/platform-express';
import express = require('express');
import type { Express, Request, Response } from 'express';
import { createConfiguredApp } from '../src/app.factory';

let cachedServer: Promise<Express> | undefined;

async function getServer(): Promise<Express> {
  if (!cachedServer) {
    cachedServer = createServer();
  }

  return cachedServer;
}

async function createServer(): Promise<Express> {
  const server = express();
  const app = await createConfiguredApp(new ExpressAdapter(server));

  await app.init();
  return server;
}

export default async function handler(req: Request, res: Response) {
  const server = await getServer();

  return server(req, res);
}

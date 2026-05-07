import type { Bot } from 'max-io';

import { createServer, type Server } from 'node:http';

import { webhookPath, webhookPort, webhookSecret } from '../env';
import type { WebhookServerRunner } from './types';

export const createCustomServerRunner = (): WebhookServerRunner => {
  let server: Server | undefined;

  return {
    mode: 'custom',
    start: async (bot: Bot) => {
      if (!webhookPath) {
        throw new Error('MAX_WEBHOOK_PATH is required for custom server mode');
      }

      bot.botInfo ??= await bot.api.getMyInfo();

      server = createServer(
        bot.webhookCallback(webhookPath, { secret: webhookSecret }),
      );

      // Если нужна полная ручная обработка, вместо `webhookCallback` можно сделать так:
      /* server = createServer((request, response) => {
        void handleWebhookRequest(bot, request, response);
      });

      const handleWebhookRequest = async (
        bot: Bot,
        request: IncomingMessage,
        response: ServerResponse,
      ) => {
        if (request.method !== 'POST' || request.url !== webhookPath) {
          sendJson(response, 404, { ok: false, error: 'not_found' });
          return;
        }

        const requestSecret = request.headers['x-max-bot-api-secret'];
        if (webhookSecret && requestSecret !== webhookSecret) {
          sendJson(response, 401, { ok: false, error: 'invalid_secret' });
          return;
        }

        try {
          const rawBody = await readRequestBody(request);
          const update = JSON.parse(rawBody) as Update;
          await bot.handleUpdate(update);
          sendJson(response, 200, { ok: true });
        } catch (error) {
          console.error(error);
          sendJson(response, 500, { ok: false, error: 'internal_error' });
        }
      };

      const readRequestBody = async (request: NodeJS.ReadableStream) => {
        const chunks: Buffer[] = [];

        for await (const chunk of request) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        return Buffer.concat(chunks).toString('utf8');
      };

      const sendJson = (
        response: ServerResponse,
        statusCode: number,
        body: Record<string, unknown>,
      ) => {
        response.writeHead(statusCode, { 'content-type': 'application/json' });
        response.end(JSON.stringify(body));
      }; */

      await new Promise<void>((resolve, reject) => {
        server?.once('error', reject);
        server?.listen(webhookPort, () => {
          server?.off('error', reject);
          resolve();
        });
      });
    },
    stop: () => {
      server?.close();
      server = undefined;
    },
  };
};

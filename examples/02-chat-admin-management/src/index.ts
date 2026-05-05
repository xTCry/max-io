import 'dotenv/config';

import { Bot } from 'max-io';
import {
  CHAT_ADMIN_OWNER_PERMISSIONS,
  CHAT_ADMIN_REGULAR_BOT_ASSIGNABLE_PERMISSIONS,
} from 'max-io/types';
import type { ChatAdmin, ChatAdminApiPermission } from 'max-io/types';

import {
  alias,
  chatId,
  confirmDeleteChat,
  permissions,
  token,
  userId,
} from './env';

type Command =
  | 'get-users'
  | 'get-admins'
  | 'set-admin'
  | 'delete-admin'
  | 'delete-chat';

const commands: { name: Command; description: string }[] = [
  { name: 'get-users', description: 'Получить список юзеров чата' },
  { name: 'get-admins', description: 'Получить список администраторов чата' },
  { name: 'set-admin', description: 'Назначить или обновить администратора' },
  { name: 'delete-admin', description: 'Снять права администратора' },
  {
    name: 'delete-chat',
    description: 'Удалить групповой чат для всех участников',
  },
];

const command = process.argv[2] as Command | undefined;

const printHelp = () => {
  console.log('Доступные команды:');
  for (const item of commands) {
    console.log(`- yarn ${item.name} — ${item.description}`);
  }
  console.log('');
  console.log('Для запуска через общий script:');
  console.log('yarn start get-admins');
};

const parseCommand = (value: Command | undefined): Command => {
  if (value && commands.some((item) => item.name === value)) return value;
  printHelp();
  process.exit(1);
};

const formatResult = (title: string, value: unknown) => {
  console.log(`\n${title}`);
  console.dir(value, { depth: 10 });
};

const main = async () => {
  const activeCommand = parseCommand(command);
  const bot = new Bot(token);

  console.log('Chat admin API check');
  console.log(`command: ${activeCommand}`);
  console.log(`chatId: ${chatId}`);

  switch (activeCommand) {
    case 'get-admins': {
      const result = await bot.api.getChatAdmins(chatId);
      formatResult('admins:', result);
      break;
    }

    case 'get-users': {
      const result = await bot.api.getChatMembers(chatId);
      formatResult('users:', result);
      break;
    }

    case 'set-admin': {
      const admin: ChatAdmin = {
        user_id: userId,
        permissions: permissions as ChatAdminApiPermission[],
        ...(alias ? { alias } : {}),
      };

      console.log(`userId: ${userId}`);
      console.log(
        'set-admin requires the bot to have add_admins permission in this chat.',
      );
      formatResult(
        'permissions observed as assignable for regular admin bots:',
        CHAT_ADMIN_REGULAR_BOT_ASSIGNABLE_PERMISSIONS,
      );
      formatResult(
        'owner permissions observed in clients but not assignable by regular admin bots:',
        CHAT_ADMIN_OWNER_PERMISSIONS,
      );
      formatResult('request:', { admins: [admin] });

      const result = await bot.api.setChatAdmins(chatId, [admin]);
      formatResult('result:', result);
      break;
    }

    case 'delete-admin': {
      console.log(`userId: ${userId}`);
      const result = await bot.api.deleteChatAdmin(chatId, userId);
      formatResult('result:', result);
      break;
    }

    case 'delete-chat': {
      if (!confirmDeleteChat) {
        throw new Error(
          'MAX_ADMIN_CONFIRM_DELETE_CHAT must be "true" for delete-chat command',
        );
      }

      console.log(
        'delete-chat requires delete permission; a regular admin bot can receive success=false when rights are insufficient.',
      );
      const result = await bot.api.deleteChat(chatId);
      formatResult('result:', result);
      break;
    }
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

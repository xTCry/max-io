import 'dotenv/config';

const scenarioScripts = [
  'yarn start:10-pr-227-upload-progress',
  'yarn start:20-chat-moderation-bot',
  'yarn start:30-video-attachment-details',
  'yarn start:40-reply-keyboard-data',
];

console.log('Доступные сценарии examples/pr-scenarios:');
for (const script of scenarioScripts) {
  console.log(`- ${script}`);
}

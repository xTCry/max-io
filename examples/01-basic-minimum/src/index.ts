import 'dotenv/config';

const scenarioScripts = [
  'yarn start:attachments',
  'yarn start:custom-context',
  'yarn start:keyboard',
  'yarn start:upload-progress',
  'yarn start:start-payload',
];

console.log('Доступные сценарии examples/01-basic-minimum:');
for (const script of scenarioScripts) {
  console.log(`- ${script}`);
}

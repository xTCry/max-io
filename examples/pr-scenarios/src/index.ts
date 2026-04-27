import 'dotenv/config';

const scenarioScripts = [
  'yarn start:10-pr-227-upload-progress',
];

console.log('Доступные сценарии examples/pr-scenarios:');
for (const script of scenarioScripts) {
  console.log(`- ${script}`);
}

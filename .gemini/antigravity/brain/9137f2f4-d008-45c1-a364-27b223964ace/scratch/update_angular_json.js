const fs = require('fs');
const content = fs.readFileSync('angular.json', 'utf8').replace(/\r\n/g, '\n');
const json = JSON.parse(content);

const buildOptions = json.projects['angular-project-app'].architect.build.options;
buildOptions.allowedCommonJsDependencies = ['html2canvas', 'xlsx'];

const budgets = json.projects['angular-project-app'].architect.build.configurations.production.budgets;
for (const b of budgets) {
  if (b.type === 'initial') {
    b.maximumWarning = '1.5MB';
    b.maximumError = '2.5MB';
  }
}

fs.writeFileSync('angular.json', JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log('Successfully updated angular.json');
